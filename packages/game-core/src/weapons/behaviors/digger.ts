import { opponentOf } from '../../tank/tank.js'
import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

export interface DiggerOptions {
  readonly steps: number
  readonly stepDistance: number
  /** How far below the surface the tunnel runs. */
  readonly depth: number
  readonly tunnelRadius: number
  readonly blastRadius: number
  readonly damage: number
}

/** Horizontal distance at which the digger knows it is under its target. */
const UNDER_TARGET = 8

/**
 * Burrows just below the surface in its direction of travel and blows up as soon as it is
 * underneath the opponent, or at the end of its tunnel (Ground Hog).
 */
export class Digger implements ProjectileBehavior {
  constructor(
    private readonly options: DiggerOptions,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    const { steps, stepDistance, depth, tunnelRadius, blastRadius, damage } = this.options
    const direction = projectile.vx >= 0 ? 1 : -1
    const target = context.tankCenter(opponentOf(context.shooter))

    let x = projectile.x
    let y = context.terrain.surfaceY(x) + depth
    for (let step = 0; step < steps; step++) {
      y = context.terrain.surfaceY(x) + depth
      context.dig(x, y, tunnelRadius)
      if (Math.abs(x - target.x) < UNDER_TARGET) break
      x += direction * stepDistance
    }
    context.explode(x, y, blastRadius, damage)
    return 'destroy'
  }
}
