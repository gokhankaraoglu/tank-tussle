import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/**
 * Drops a ball of dirt instead of exploding. Burying a tank still scores (`buryDamage`),
 * so it is a real attack as well as a way to reshape the field.
 */
export class DirtBomb implements ProjectileBehavior {
  constructor(
    private readonly radius: number,
    private readonly buryDamage: number,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    context.award(projectile.x, projectile.y, this.radius, this.buryDamage)
    context.addDirt(projectile.x, projectile.y, this.radius)
    return 'destroy'
  }
}
