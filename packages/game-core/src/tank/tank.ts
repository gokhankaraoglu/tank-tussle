import { AIM, TANK, WORLD } from '../constants.js'
import { clamp, type Vec2 } from '../math/vector.js'
import { muzzle, tankPose, worldAngle } from './tank-pose.js'
import type { TerrainView } from '../terrain/terrain.js'

export type PlayerIndex = 0 | 1
export const PLAYER_INDICES: readonly PlayerIndex[] = [0, 1]

export const opponentOf = (player: PlayerIndex): PlayerIndex => (player === 0 ? 1 : 0)

export interface TankState {
  readonly name: string
  readonly color: string
  readonly x: number
  /**
   * Barrel elevation in degrees, relative to the hull (0 = along the hull to the right,
   * 90 = straight up out of the turret, 180 = to the left). See `worldAngle`.
   */
  readonly angle: number
  /** 0–100. */
  readonly power: number
  readonly score: number
  readonly movesLeft: number
}

export const createTank = (name: string, color: string, x: number, angle: number): TankState => ({
  name,
  color,
  x,
  angle,
  power: 60,
  score: 0,
  movesLeft: TANK.movesPerMatch,
})

export const clampAngle = (angle: number): number =>
  clamp(angle, AIM.minElevation, AIM.maxElevation)
export const clampPower = (power: number): number => clamp(power, AIM.minPower, AIM.maxPower)
export const clampTankX = (x: number): number => clamp(x, TANK.radius, WORLD.width - TANK.radius)

/** Point used for hit detection and blast damage. */
export const tankCenter = (tank: Pick<TankState, 'x'>, terrain: TerrainView): Vec2 =>
  tankPose(tank, terrain).center

/** Where a shell leaves the barrel, taking the tank's tilt into account. */
export const barrelTip = (tank: TankState, terrain: TerrainView): Vec2 => {
  const pose = tankPose(tank, terrain)
  return muzzle(pose, worldAngle(pose, tank.angle))
}

/** Direction the barrel points in the world, in degrees: the hull tilt plus the elevation. */
export const barrelDirection = (tank: TankState, terrain: TerrainView): number =>
  worldAngle(tankPose(tank, terrain), tank.angle)
