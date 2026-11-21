export interface Vec2 {
  readonly x: number
  readonly y: number
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)

export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180

/** Wraps an angle in radians to the range [-π, π]. */
export const normalizeAngle = (radians: number): number =>
  Math.atan2(Math.sin(radians), Math.cos(radians))

/**
 * Velocity for an aim angle in degrees (0 = right, 90 = straight up, 180 = left).
 * Screen coordinates: y grows downwards.
 */
export const velocityFromAngle = (angleDegrees: number, speed: number): Vec2 => {
  const radians = degToRad(angleDegrees)
  return { x: Math.cos(radians) * speed, y: -Math.sin(radians) * speed }
}
