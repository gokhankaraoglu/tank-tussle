import { DelayedBlast } from './delayed-blast.js'
import type {
  ImpactResult,
  Projectile,
  ProjectileAppearance,
  ProjectileBehavior,
  SimulationContext,
} from '../types.js'

export interface ChainOptions {
  readonly links: number
  readonly spacing: number
  readonly delayTicks: number
  readonly radius: number
  readonly damage: number
}

/** Explodes, then sets off a row of blasts in the direction of travel. */
export class ChainReaction implements ProjectileBehavior {
  constructor(
    private readonly options: ChainOptions,
    readonly appearance: ProjectileAppearance,
  ) {}

  onImpact(projectile: Projectile, _impact: unknown, context: SimulationContext): ImpactResult {
    const { links, spacing, delayTicks, radius, damage } = this.options
    const direction = projectile.vx >= 0 ? 1 : -1
    context.explode(projectile.x, projectile.y, radius, damage)

    for (let link = 1; link < links; link++) {
      context.spawn({
        x: projectile.x + direction * spacing * link,
        y: projectile.y,
        vx: 0,
        vy: 0,
        delayTicks: delayTicks * link,
        behavior: new DelayedBlast(radius, damage, this.appearance),
      })
    }
    return 'destroy'
  }
}
