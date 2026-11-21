import { TANK } from '../constants.js'
import { clamp, degToRad, velocityFromAngle, type Vec2 } from '../math/vector.js'
import type { TerrainView } from '../terrain/terrain.js'
import type { TankState } from './tank.js'

/** Where a tank sits and how it is oriented on the terrain. */
export interface TankPose {
  /** Midpoint between the two track contacts. */
  readonly base: Vec2
  /** Hull tilt in degrees, positive when the right end is higher (same sense as aim angles). */
  readonly tilt: number
  /** Unit vector pointing out of the top of the hull (screen coordinates). */
  readonly up: Vec2
  /** Hit-detection and blast-damage centre. */
  readonly center: Vec2
  /** The point the turret and barrel rotate around. */
  readonly pivot: Vec2
}

/** Rests the hull on both track ends, so the tank leans with the slope it stands on. */
export const tankPose = (tank: Pick<TankState, 'x'>, terrain: TerrainView): TankPose => {
  const leftY = terrain.surfaceY(tank.x - TANK.halfTrack)
  const rightY = terrain.surfaceY(tank.x + TANK.halfTrack)
  const rawTilt = (Math.atan2(leftY - rightY, TANK.halfTrack * 2) * 180) / Math.PI
  const tilt = clamp(rawTilt, -TANK.maxTilt, TANK.maxTilt)

  // A bump under the middle props the hull up rather than letting it sink into the ground.
  const base = { x: tank.x, y: Math.min(terrain.surfaceY(tank.x), (leftY + rightY) / 2) }
  const radians = degToRad(tilt)
  const up = { x: -Math.sin(radians), y: -Math.cos(radians) }
  const along = (distance: number): Vec2 => ({
    x: base.x + up.x * distance,
    y: base.y + up.y * distance,
  })

  return { base, tilt, up, center: along(TANK.radius * 0.5), pivot: along(TANK.pivotHeight) }
}

/** World angle of a barrel raised `elevation` degrees from a hull leaning `tilt` degrees. */
export const worldAngle = (pose: Pick<TankPose, 'tilt'>, elevation: number): number =>
  pose.tilt + elevation

/** Tip of the barrel for a world angle: where shells leave the tank. */
export const muzzle = (pose: TankPose, angle: number): Vec2 => {
  const direction = velocityFromAngle(angle, TANK.barrelLength)
  return { x: pose.pivot.x + direction.x, y: pose.pivot.y + direction.y }
}
