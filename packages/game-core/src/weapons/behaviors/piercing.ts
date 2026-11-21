import { PHYSICS } from '../../constants.js'
import type {
  Impact,
  ImpactResult,
  Projectile,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Width of the hole a piercing round leaves behind. */
const TUNNEL_RADIUS = 2.5

/**
 * Decorator: punches through up to `maxDepth` pixels of terrain, leaving a thin tunnel,
 * before the inner behavior handles the impact. Tanks stop it immediately.
 */
export class Piercing implements ProjectileBehavior {
  private depthLeft: number

  constructor(
    private readonly inner: ProjectileBehavior,
    maxDepth: number,
  ) {
    this.depthLeft = maxDepth
  }

  get appearance() {
    return this.inner.appearance
  }

  get gravityScale() {
    return this.inner.gravityScale ?? 1
  }

  onImpact(projectile: Projectile, impact: Impact, context: SimulationContext): ImpactResult {
    if (impact.kind !== 'terrain' || this.depthLeft <= 0) {
      return this.inner.onImpact(projectile, impact, context)
    }
    // Each call is one integration sub-step spent inside the ground.
    this.depthLeft -= Math.hypot(projectile.vx, projectile.vy) / PHYSICS.tickRate / PHYSICS.substeps
    context.dig(projectile.x, projectile.y, TUNNEL_RADIUS)
    return 'continue'
  }
}
