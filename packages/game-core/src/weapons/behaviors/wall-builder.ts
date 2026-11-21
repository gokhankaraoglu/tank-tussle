import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

/** Raises a solid wall where it lands: cover for you, or a tower under the enemy. */
export class WallBuilder implements ProjectileBehavior {
  constructor(
    private readonly halfWidth: number,
    private readonly height: number,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    context.buildWall(projectile.x, this.halfWidth, this.height)
    context.signal('build', projectile.x, projectile.y)
    return 'destroy'
  }
}
