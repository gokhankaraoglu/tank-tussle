import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** A stationary charge that explodes on the surface below it once it becomes active. */
export class DelayedBlast implements ProjectileBehavior {
  readonly gravityScale = 0

  constructor(
    private readonly radius: number,
    private readonly damage: number,
    readonly appearance: ProjectileAppearance,
  ) {}

  onTick(projectile: Projectile, context: SimulationContext): void {
    context.explode(projectile.x, context.terrain.surfaceY(projectile.x), this.radius, this.damage)
    projectile.alive = false
  }

  onImpact(): ImpactResult {
    return 'destroy'
  }
}
