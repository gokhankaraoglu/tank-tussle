import {
  createDefaultWeaponRegistry,
  createMatch,
  flatLayers,
  Terrain,
  WORLD,
  type MatchState,
} from '@tank-tussle/game-core'
import { describe, expect, it } from 'vitest'
import { TankMotion } from './tank-motion.js'

const registry = createDefaultWeaponRegistry()
const flat = flatLayers(Array.from({ length: WORLD.width }, () => 200))
const base = (): MatchState => ({
  ...createMatch(
    {
      mode: 'versus',
      players: [
        { name: 'A', color: '#ff0000' },
        { name: 'B', color: '#0000ff' },
      ],
      seed: 3,
    },
    registry,
  ),
  terrain: flat,
})
const terrain = Terrain.fromLayers(flat)

/** The same state after player 0 drove `distance` pixels to the right. */
const driven = (state: MatchState, distance: number): MatchState => ({
  ...state,
  tanks: [
    { ...state.tanks[0], x: state.tanks[0].x + distance, movesLeft: state.tanks[0].movesLeft - 1 },
    state.tanks[1],
  ],
})

describe('TankMotion', () => {
  it('glides to the new position instead of jumping, then rests there', () => {
    const motion = new TankMotion()
    const start = base()
    const x0 = start.tanks[0].x
    motion.frame(start, terrain, 0, true)
    const after = driven(start, 36)
    motion.frame(after, terrain, 10, true) // the frame that sees the move starts the drive

    const midway = motion.frame(after, terrain, 300, true).x[0]
    expect(midway).toBeGreaterThan(x0)
    expect(midway).toBeLessThan(x0 + 36)
    expect(motion.frame(after, terrain, 5000, true).x[0]).toBe(x0 + 36)
  })

  it('rolls the tracks and kicks up dust while driving', () => {
    const motion = new TankMotion()
    const start = base()
    motion.frame(start, terrain, 0, true)
    const after = driven(start, 36)
    motion.frame(after, terrain, 100, true)
    const frame = motion.frame(after, terrain, 300, true)
    expect(frame.looks[0].rolled).toBeGreaterThan(0)
    expect(frame.dust.length).toBeGreaterThan(0)
    expect(frame.looks[1].rolled).toBe(0)
  })

  it('does not drive when a position changes without a move (shots, teleports)', () => {
    const motion = new TankMotion()
    const start = base()
    motion.frame(start, terrain, 0, true)
    const warped = {
      ...start,
      tanks: [{ ...start.tanks[0], x: start.tanks[0].x + 200 }, start.tanks[1]] as const,
    }
    expect(motion.frame(warped as MatchState, terrain, 50, true).x[0]).toBe(start.tanks[0].x + 200)
  })

  it('follows the state directly while a shot is playing', () => {
    const motion = new TankMotion()
    const start = base()
    motion.frame(start, terrain, 0, true)
    const after = driven(start, 36)
    expect(motion.frame(after, terrain, 50, false).x[0]).toBe(after.tanks[0].x)
  })
})
