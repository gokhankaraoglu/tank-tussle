import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Does no damage: the shooter's tank reappears where the shell lands. */
export class Teleport implements ProjectileBehavior {
  constructor(readonly appearance: ProjectileAppearance) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    context.moveTank(context.shooter, projectile.x)
    return 'destroy'
  }
}
