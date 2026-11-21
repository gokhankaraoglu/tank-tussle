import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Explodes on the first impact. The building block for most weapons. */
export class Explosive implements ProjectileBehavior {
  constructor(
    private readonly radius: number,
    private readonly damage: number,
    readonly appearance: ProjectileAppearance,
    readonly gravityScale = 1,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    context.explode(projectile.x, projectile.y, this.radius, this.damage)
    return 'destroy'
  }
}
