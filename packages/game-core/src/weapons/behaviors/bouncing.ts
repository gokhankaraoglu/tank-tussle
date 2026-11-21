import { surfaceNormal } from '../../terrain/terrain.js'
import type {
  Impact,
  ImpactResult,
  Projectile,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Decorator: bounces off the terrain a few times, then lets the inner behavior handle impact. */
export class Bouncing implements ProjectileBehavior {
  private bouncesLeft: number

  constructor(
    private readonly inner: ProjectileBehavior,
    bounces: number,
    private readonly restitution = 0.65,
  ) {
    this.bouncesLeft = bounces
  }

  get appearance() {
    return this.inner.appearance
  }

  get gravityScale() {
    return this.inner.gravityScale ?? 1
  }

  onImpact(projectile: Projectile, impact: Impact, context: SimulationContext): ImpactResult {
    if (impact.kind !== 'terrain' || this.bouncesLeft <= 0) {
      return this.inner.onImpact(projectile, impact, context)
    }

    this.bouncesLeft--
    context.signal('bounce', projectile.x, projectile.y)
    const normal = surfaceNormal(context.terrain, projectile.x)
    const dot = projectile.vx * normal.x + projectile.vy * normal.y
    projectile.vx = (projectile.vx - 2 * dot * normal.x) * this.restitution
    projectile.vy = (projectile.vy - 2 * dot * normal.y) * this.restitution
    projectile.y = context.terrain.surfaceY(projectile.x) - 1
    return 'continue'
  }
}
