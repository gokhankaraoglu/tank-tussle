import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Explodes, then steals a share of the points it earned from the opponent's score. */
export class Leeching implements ProjectileBehavior {
  constructor(
    private readonly radius: number,
    private readonly damage: number,
    /** Fraction of the earned points that is also taken from the opponent. */
    private readonly share: number,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    const earned = context.explode(projectile.x, projectile.y, this.radius, this.damage)
    context.steal(earned * this.share)
    return 'destroy'
  }
}
