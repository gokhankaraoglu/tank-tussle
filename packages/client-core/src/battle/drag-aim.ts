import {
  AIM,
  clampAngle,
  clampPower,
  WORLD,
  type TankPose,
  type Vec2,
} from '@tank-tussle/game-core'

/** Dragging this far (world pixels) from the turret means full power. */
export const DRAG_FULL_POWER = 260

/** The on-screen box the battlefield is drawn in. */
export interface ViewRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

/** Converts a pointer position on the battlefield view into world coordinates. */
export const toWorldPoint = (clientX: number, clientY: number, rect: ViewRect): Vec2 => ({
  x: ((clientX - rect.left) / rect.width) * WORLD.width,
  y: ((clientY - rect.top) / rect.height) * WORLD.height,
})

/**
 * Aim that points the barrel at `point`: direction gives the elevation (relative to the leaning
 * hull), distance from the turret gives the power.
 */
export const aimFromPoint = (pose: TankPose, point: Vec2): { angle: number; power: number } => {
  const dx = point.x - pose.pivot.x
  const dy = pose.pivot.y - point.y
  let elevation = (Math.atan2(dy, dx) * 180) / Math.PI - pose.tilt
  // atan2 wraps at ±180°; pointing down-left should read as just past 180°, not −180°.
  if (elevation < AIM.minElevation - 90) elevation += 360
  return {
    angle: clampAngle(Math.round(elevation * 10) / 10),
    power: clampPower(Math.round((Math.hypot(dx, dy) / DRAG_FULL_POWER) * 1000) / 10),
  }
}
