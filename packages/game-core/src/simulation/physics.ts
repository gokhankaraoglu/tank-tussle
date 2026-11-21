import { PHYSICS, TANK, WORLD } from '../constants.js'
import { distance, type Vec2 } from '../math/vector.js'
import { PLAYER_INDICES, type PlayerIndex } from '../tank/tank.js'
import type { TerrainView } from '../terrain/terrain.js'

export const SUBSTEP_SECONDS = 1 / PHYSICS.tickRate / PHYSICS.substeps

export interface Body {
  x: number
  y: number
  vx: number
  vy: number
}

/** Semi-implicit Euler step. */
export const integrate = (body: Body, gravityScale: number, dt = SUBSTEP_SECONDS): void => {
  body.vy += PHYSICS.gravity * gravityScale * dt
  body.x += body.vx * dt
  body.y += body.vy * dt
}

export const isOutOfWorld = (body: Vec2): boolean =>
  body.x < 0 || body.x >= WORLD.width || body.y > WORLD.height

/** Returns the tank hit by the body, ignoring the shooter while the shot is leaving the barrel. */
export const findHitTank = (
  body: Vec2,
  tankCenters: readonly [Vec2, Vec2],
  ignore: PlayerIndex | null,
): PlayerIndex | null => {
  for (const player of PLAYER_INDICES) {
    if (player === ignore) continue
    if (distance(body, tankCenters[player]) < TANK.radius) return player
  }
  return null
}

export const hitsTerrain = (body: Vec2, terrain: TerrainView): boolean =>
  terrain.isSolid(body.x, body.y)
