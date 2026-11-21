import { spreadOffsets } from '../launch.js'
import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

export interface AirstrikeOptions {
  readonly bombs: number
  /** Horizontal distance between neighbouring bombs. */
  readonly spacing: number
  readonly ticksBetweenBombs: number
  readonly createBomb: () => ProjectileBehavior
}

const DROP_HEIGHT = -30
const DROP_SPEED = 260

/** A marker shell: where it lands, a line of bombs falls straight down from the sky. */
export class Airstrike implements ProjectileBehavior {
  constructor(
    private readonly options: AirstrikeOptions,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    const { bombs, spacing, ticksBetweenBombs, createBomb } = this.options
    context.signal('split', projectile.x, projectile.y)
    spreadOffsets(bombs, spacing).forEach((offset, index) =>
      context.spawn({
        x: projectile.x + offset,
        y: DROP_HEIGHT,
        vx: 0,
        vy: DROP_SPEED,
        delayTicks: 20 + index * ticksBetweenBombs,
        behavior: createBomb(),
      }),
    )
    return 'destroy'
  }
}
