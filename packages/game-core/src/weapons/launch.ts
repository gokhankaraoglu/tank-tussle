import { velocityFromAngle } from '../math/vector.js'
import type { LaunchParams, ProjectileBehavior, ProjectileSpec } from './types.js'

interface LaunchOptions {
  readonly angleOffset?: number
  readonly speedScale?: number
  readonly delayTicks?: number
}

/** Builds a projectile fired from the barrel, optionally rotated, slowed down or delayed. */
export const launchFromBarrel = (
  params: LaunchParams,
  behavior: ProjectileBehavior,
  { angleOffset = 0, speedScale = 1, delayTicks = 0 }: LaunchOptions = {},
): ProjectileSpec => {
  const velocity = velocityFromAngle(params.angle + angleOffset, params.speed * speedScale)
  return {
    x: params.origin.x,
    y: params.origin.y,
    vx: velocity.x,
    vy: velocity.y,
    behavior,
    delayTicks,
  }
}

/** Evenly spread offsets around zero, e.g. (3, 4) → [-4, 0, 4]. */
export const spreadOffsets = (count: number, step: number): number[] =>
  Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * step)
