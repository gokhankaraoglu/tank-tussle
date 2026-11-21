import { spreadOffsets } from '../launch.js'
import type {
  Impact,
  ImpactResult,
  Projectile,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Decorator: at the top of its arc the projectile splits into several children (Hail Storm). */
export class SplitAtApex implements ProjectileBehavior {
  constructor(
    private readonly inner: ProjectileBehavior,
    private readonly count: number,
    /** Horizontal speed difference between neighbouring children, px/s. */
    private readonly spread: number,
    private readonly createChild: () => ProjectileBehavior,
  ) {}

  get appearance() {
    return this.inner.appearance
  }

  onTick(projectile: Projectile, context: SimulationContext): void {
    if (projectile.age < 2 || projectile.vy < 0) return
    context.signal('split', projectile.x, projectile.y)

    for (const offset of spreadOffsets(this.count, this.spread)) {
      context.spawn({
        x: projectile.x,
        y: projectile.y,
        vx: projectile.vx + offset,
        vy: projectile.vy,
        behavior: this.createChild(),
      })
    }
    projectile.alive = false
  }

  onImpact(projectile: Projectile, impact: Impact, context: SimulationContext): ImpactResult {
    return this.inner.onImpact(projectile, impact, context)
  }
}
