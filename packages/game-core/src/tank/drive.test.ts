import { describe, expect, it } from 'vitest'
import { TANK, WORLD } from '../constants.js'
import { flatLayers, Terrain } from '../terrain/terrain.js'
import { drive } from './drive.js'

/** Terrain whose height at column x is `height(x)`. */
const terrainOf = (height: (x: number) => number): Terrain =>
  Terrain.fromLayers(flatLayers(Array.from({ length: WORLD.width }, (_, x) => height(x))))

const flat = terrainOf(() => 200)

describe('drive', () => {
  it('covers the full distance on flat ground', () => {
    expect(drive(300, 1, 36, flat)).toEqual({ x: 336, distance: 36, stoppedBy: null })
    expect(drive(300, -1, 36, flat)).toEqual({ x: 264, distance: 36, stoppedBy: null })
  })

  it('stops with its front track against a wall', () => {
    const wall = terrainOf((x) => (x >= 350 ? 260 : 200))
    const route = drive(300, 1, 36, wall)
    expect(route.stoppedBy).toBe('wall')
    expect(route.x + TANK.halfTrack).toBeLessThan(350)
    expect(route.distance).toBeGreaterThan(0)
  })

  it('climbs a kerb low enough for the tracks', () => {
    const kerb = terrainOf((x) => (x >= 330 ? 200 + TANK.maxStep : 200))
    expect(drive(300, 1, 36, kerb).stoppedBy).toBeNull()
  })

  it('climbs a gentle slope but not a steep one', () => {
    const gentle = terrainOf((x) => 200 + Math.max(0, x - 320) * 0.4) // about 22°
    const steep = terrainOf((x) => 200 + Math.max(0, x - 320) * 0.9) // about 42°
    expect(drive(300, 1, 36, gentle).stoppedBy).toBeNull()
    expect(drive(300, 1, 36, steep).stoppedBy).toBe('too-steep')
  })

  it('stops at a cliff edge instead of driving off it', () => {
    const cliff = terrainOf((x) => (x >= 330 ? 120 : 200))
    const route = drive(300, 1, 36, cliff)
    expect(route.stoppedBy).toBe('cliff')
    expect(route.x).toBeLessThan(330)
  })

  it('drives away from a wall it is standing against', () => {
    const wall = terrainOf((x) => (x >= 350 ? 260 : 200))
    const against = drive(300, 1, 36, wall).x
    expect(drive(against, -1, 36, wall)).toMatchObject({ distance: 36, stoppedBy: null })
    expect(drive(against, 1, 36, wall)).toEqual({ x: against, distance: 0, stoppedBy: 'wall' })
  })

  it('stops at the edge of the battlefield', () => {
    expect(drive(TANK.radius + 5, -1, 36, flat)).toEqual({
      x: TANK.radius,
      distance: 5,
      stoppedBy: 'edge',
    })
  })
})
