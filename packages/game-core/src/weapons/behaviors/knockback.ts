import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

export interface KnockbackOptions {
  readonly radius: number
  readonly damage: number
  /** Tanks within this distance of the impact are pushed… */
  readonly range: number
  /** …up to this far away from it. */
  readonly distance: number
}

/** A blast that also shoves nearby tanks away — off their hill, or into a pit. */
export class Knockback implements ProjectileBehavior {
  constructor(
    private readonly options: KnockbackOptions,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    const { radius, damage, range, distance } = this.options
    context.explode(projectile.x, projectile.y, radius, damage)
    context.shove(projectile.x, range, distance)
    return 'destroy'
  }
}
