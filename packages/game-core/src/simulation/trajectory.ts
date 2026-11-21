import { PHYSICS } from '../constants.js'
import type { Vec2 } from '../math/vector.js'
import { velocityFromAngle } from '../math/vector.js'
import { tankCenter, type PlayerIndex, type TankState } from '../tank/tank.js'
import { muzzle, tankPose, worldAngle } from '../tank/tank-pose.js'
import type { TerrainView } from '../terrain/terrain.js'
import { findHitTank, hitsTerrain, integrate, isOutOfWorld } from './physics.js'

export interface PredictedImpact {
  readonly point: Vec2
  readonly hitPlayer: PlayerIndex | null
}

/**
 * `angle` is the barrel elevation, as in `FireCommand`.
 * Lightweight flight of a plain shell (gravity, no weapon behavior).
 * Returns null if the shell leaves the world. Used by the CPU and for aiming aids.
 */
export const predictImpact = (
  terrain: TerrainView,
  tanks: readonly [TankState, TankState],
  shooter: PlayerIndex,
  angle: number,
  power: number,
): PredictedImpact | null => {
  const pose = tankPose(tanks[shooter], terrain)
  const direction = worldAngle(pose, angle)
  const origin = muzzle(pose, direction)
  const velocity = velocityFromAngle(direction, power * PHYSICS.powerToSpeed)
  const body = { x: origin.x, y: origin.y, vx: velocity.x, vy: velocity.y }
  const centers: [Vec2, Vec2] = [tankCenter(tanks[0], terrain), tankCenter(tanks[1], terrain)]
  const maxSteps = PHYSICS.maxTicks * PHYSICS.substeps
  const graceSteps = PHYSICS.selfHitGraceTicks * PHYSICS.substeps

  for (let step = 0; step < maxSteps; step++) {
    integrate(body, 1)
    if (isOutOfWorld(body)) return null

    const hitPlayer = findHitTank(body, centers, step < graceSteps ? shooter : null)
    if (hitPlayer !== null) return { point: { x: body.x, y: body.y }, hitPlayer }
    if (hitsTerrain(body, terrain)) return { point: { x: body.x, y: body.y }, hitPlayer: null }
  }
  return null
}
