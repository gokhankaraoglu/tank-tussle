import { normalizeAngle } from '../../math/vector.js'
import { opponentOf } from '../../tank/tank.js'
import type {
  Impact,
  ImpactResult,
  Projectile,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Decorator: after the apex, steers towards the opponent at a limited turn rate. */
export class Homing implements ProjectileBehavior {
  constructor(
    private readonly inner: ProjectileBehavior,
    /** Maximum turn per tick in radians. */
    private readonly turnRate: number,
  ) {}

  get appearance() {
    return this.inner.appearance
  }

  get gravityScale() {
    return this.inner.gravityScale ?? 1
  }

  onTick(projectile: Projectile, context: SimulationContext): void {
    if (projectile.vy < 0) return

    const target = context.tankCenter(opponentOf(context.shooter))
    const desired = Math.atan2(target.y - projectile.y, target.x - projectile.x)
    const current = Math.atan2(projectile.vy, projectile.vx)
    const turn = Math.max(
      -this.turnRate,
      Math.min(this.turnRate, normalizeAngle(desired - current)),
    )
    const speed = Math.hypot(projectile.vx, projectile.vy)
    projectile.vx = Math.cos(current + turn) * speed
    projectile.vy = Math.sin(current + turn) * speed
  }

  onImpact(projectile: Projectile, impact: Impact, context: SimulationContext): ImpactResult {
    return this.inner.onImpact(projectile, impact, context)
  }
}
