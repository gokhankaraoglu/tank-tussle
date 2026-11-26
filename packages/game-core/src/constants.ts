/** Logical world size in pixels. Renderers scale this to the screen. */
export const WORLD = {
  width: 1000,
  height: 600,
} as const

export const PHYSICS = {
  /** Downward acceleration in px/s². */
  gravity: 400,
  tickRate: 60,
  /** Integration sub-steps per tick; keeps fast projectiles from tunnelling through terrain. */
  substeps: 4,
  /** Hard stop for a single shot (25 seconds). */
  maxTicks: 60 * 25,
  /** Muzzle speed in px/s for each power point. */
  powerToSpeed: 9.5,
  /** Ticks during which a fresh projectile cannot hit its own tank. */
  selfHitGraceTicks: 8,
} as const

export const TANK = {
  radius: 16,
  barrelLength: 28,
  /** Half the distance between the track ends; the hull rests on the ground at both. */
  halfTrack: 18,
  /** Height of the turret pivot above the ground, along the hull's up direction. */
  pivotHeight: 19,
  /** Steepest slope a tank can sit on, in degrees. */
  maxTilt: 40,
  moveDistance: 36,
  /** Steepest slope (degrees, over the track length) a tank can drive up. */
  maxClimb: 32,
  /** Steepest slope it will drive down; beyond this it would tip over, so it stops. */
  maxDescent: 40,
  /** Highest vertical step (pixels) the tracks can climb, like a kerb or a crater lip. */
  maxStep: 6,
  /** Deepest sheer drop (pixels) it will drive off; anything deeper is a cliff edge. */
  maxDrop: 14,
  movesPerMatch: 4,
} as const

export const AIM = {
  /**
   * Barrel elevation is measured from the hull, like on a real tank: 0 = along the hull to the
   * right, 90 = straight out of the turret top, 180 = along the hull to the left. When the hull
   * leans on a slope the barrel leans with it (world angle = tilt + elevation).
   */
  minElevation: -8,
  maxElevation: 188,
  minPower: 0,
  maxPower: 100,
} as const

export const TERRAIN = {
  minHeight: 40,
  maxHeight: 470,
  /** Dirt can never be piled higher than this. */
  ceiling: WORLD.height - 40,
  /** Loose dirt slides until no step between neighbouring columns is steeper than this. */
  dirtReposeSlope: 1,
  /** Upper bound on settling passes; keeps the cost of a slide predictable. */
  dirtSettlePasses: 300,
} as const

export const MATCH = {
  weaponsPerPlayer: 10,
  shopSize: 20,
} as const

/**
 * Points rewarded for a blast: `damage × closeness^falloff`, where closeness is 1 at the tank's
 * centre and 0 at the edge of the blast. A falloff above 1 rewards accuracy over near misses.
 * Blasts centred on the tank body count as direct hits and earn a bonus.
 */
export const SCORING = {
  falloff: 1.5,
  directHitBonus: 0.5,
  /** Each consecutive scoring shot adds this much to the multiplier of the next one… */
  comboStep: 0.25,
  /** …up to this many shots in a row (×1.75 at most). A miss resets the streak. */
  comboMaxStreak: 3,
} as const
