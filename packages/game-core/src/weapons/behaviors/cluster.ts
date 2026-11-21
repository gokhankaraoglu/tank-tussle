import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

export interface ClusterOptions {
  readonly count: number
  readonly speed: number
  /** Total fan angle in degrees, centred on straight up. */
  readonly fan: number
  readonly createChild: () => ProjectileBehavior
  /** Optional blast at the impact point itself. */
  readonly blast?: { readonly radius: number; readonly damage: number }
}

/** On impact, throws a fan of child projectiles into the air (Pineapple, Scatter Shot). */
export class ClusterOnImpact implements ProjectileBehavior {
  constructor(
    private readonly options: ClusterOptions,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    const { count, speed, fan, createChild, blast } = this.options
    if (blast) context.explode(projectile.x, projectile.y, blast.radius, blast.damage)
    context.signal('split', projectile.x, projectile.y)

    const startY = context.terrain.surfaceY(projectile.x) - 2
    for (let index = 0; index < count; index++) {
      const angle = 90 - fan / 2 + (fan * (index + 0.5)) / count + context.rng.range(-6, 6)
      const radians = (angle * Math.PI) / 180
      const childSpeed = speed * context.rng.range(0.75, 1.1)
      context.spawn({
        x: projectile.x,
        y: Math.min(projectile.y, startY),
        vx: Math.cos(radians) * childSpeed,
        vy: -Math.sin(radians) * childSpeed,
        behavior: createChild(),
      })
    }
    return 'destroy'
  }
}
