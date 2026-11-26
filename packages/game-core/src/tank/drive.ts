import { TANK } from '../constants.js'
import type { TerrainView } from '../terrain/terrain.js'
import { clampTankX } from './tank.js'

/** Why a tank stopped before covering the whole distance. */
export type DriveStop = 'wall' | 'too-steep' | 'cliff' | 'edge'

export interface DriveResult {
  /** Where the tank ends up. */
  readonly x: number
  /** Pixels actually driven (0 when it could not move at all). */
  readonly distance: number
  /** What stopped it early, or null when it covered the full distance. */
  readonly stoppedBy: DriveStop | null
}

export const DRIVE_STOP_MESSAGES: Record<DriveStop, string> = {
  wall: 'A wall is in the way',
  'too-steep': 'Too steep to drive there',
  cliff: 'The tank would drive off a cliff',
  edge: 'The edge of the battlefield',
}

/** Height difference across the hull, as a slope in degrees uphill in the direction of travel. */
const slopeAhead = (x: number, direction: -1 | 1, terrain: TerrainView): number => {
  const behind = terrain.surfaceY(x - direction * TANK.halfTrack)
  const ahead = terrain.surfaceY(x + direction * TANK.halfTrack)
  return (Math.atan2(behind - ahead, TANK.halfTrack * 2) * 180) / Math.PI
}

/** Whether the tank can stand at `x` having driven in `direction`, and if not, why. */
const obstacleAt = (x: number, direction: -1 | 1, terrain: TerrainView): DriveStop | null => {
  if (clampTankX(x) !== x) return 'edge'
  // The leading track end meets the ground first: a sudden step there is a wall or a ledge.
  const front = x + direction * TANK.halfTrack
  const rise = terrain.surfaceY(front - direction) - terrain.surfaceY(front)
  if (rise > TANK.maxStep) return 'wall'
  if (-rise > TANK.maxDrop) return 'cliff'
  // The hull as a whole: a long climb or descent that is simply too steep.
  const slope = slopeAhead(x, direction, terrain)
  if (slope > TANK.maxClimb) return 'too-steep'
  if (-slope > TANK.maxDescent) return 'too-steep'
  return null
}

/**
 * Drives a tank pixel by pixel over the terrain, the way tracks would: it climbs gentle slopes
 * and small steps, and stops in front of walls, slopes that are too steep and cliff edges.
 * Pure and deterministic, so the server, the client and the renderer all agree.
 */
export const drive = (
  x: number,
  direction: -1 | 1,
  distance: number,
  terrain: TerrainView,
): DriveResult => {
  let current = x
  for (let step = 0; step < distance; step++) {
    const stop = obstacleAt(current + direction, direction, terrain)
    if (stop) return { x: current, distance: Math.abs(current - x), stoppedBy: stop }
    current += direction
  }
  return { x: current, distance: Math.abs(current - x), stoppedBy: null }
}
