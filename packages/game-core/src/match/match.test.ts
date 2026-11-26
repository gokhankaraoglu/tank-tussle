import { describe, expect, it } from 'vitest'
import { AIM, TANK } from '../constants.js'
import { createDefaultWeaponRegistry } from '../weapons/registry.js'
import { barrelDirection } from '../tank/tank.js'
import { tankPose } from '../tank/tank-pose.js'
import { flatLayers, Terrain } from '../terrain/terrain.js'
import { MatchRuleError } from './errors.js'
import {
  aimTank,
  comboMultiplier,
  createMatch,
  dealAllWeapons,
  enableAutoPick,
  fire,
  moveTank,
  openSlots,
  pickWeapon,
  replayShot,
} from './match.js'
import type { MatchState } from './types.js'

const registry = createDefaultWeaponRegistry()

/** The same match on hand-made ground, so movement tests do not depend on the generated map. */
const withGround = (state: MatchState, height: (column: number) => number): MatchState => ({
  ...state,
  terrain: flatLayers(state.terrain.heights.map((_, column) => height(column))),
})
const players = [
  { name: 'Alice', color: '#ff0000' },
  { name: 'Bob', color: '#0000ff' },
] as const

const newVersus = (weaponsPerPlayer = 2): MatchState =>
  createMatch(
    { mode: 'versus', players, seed: 1, weaponsPerPlayer, shopSize: weaponsPerPlayer * 2 },
    registry,
  )

const finishShop = (state: MatchState): MatchState => {
  let current = state
  while (current.phase === 'shop') {
    current = pickWeapon(current, current.shop.picker, openSlots(current.shop)[0]!)
  }
  return current
}

describe('createMatch', () => {
  it('starts a versus match in the shop with a full pool', () => {
    const state = newVersus()
    expect(state.phase).toBe('shop')
    expect(state.shop.pool).toHaveLength(4)
    expect(state.inventories).toEqual([[], []])
  })

  it('starts practice immediately with every weapon', () => {
    const state = createMatch({ mode: 'practice', players, seed: 1 }, registry)
    expect(state.phase).toBe('playing')
    expect(state.inventories[0]).toEqual(registry.ids())
  })

  it('is reproducible from its seed', () => {
    expect(newVersus()).toEqual(newVersus())
  })
})

describe('pickWeapon', () => {
  it('alternates pickers and moves weapons into inventories', () => {
    const state = newVersus()
    const first = state.shop.pool[0]
    const next = pickWeapon(state, 0, 0)
    expect(next.shop.takenBy[0]).toBe(0)
    expect(next.shop.pool).toEqual(state.shop.pool)
    expect(next.inventories[0]).toEqual([first])
    expect(next.shop.picker).toBe(1)
    expect(openSlots(next.shop)).toHaveLength(3)
  })

  it('rejects picks out of turn', () => {
    expect(() => pickWeapon(newVersus(), 1, 0)).toThrow(MatchRuleError)
  })

  it('starts the battle once both players are armed', () => {
    const state = finishShop(newVersus())
    expect(state.phase).toBe('playing')
    expect(state.inventories.map((items) => items.length)).toEqual([2, 2])
    expect(state.turn).toBe(0)
  })
})

describe('pool slots', () => {
  it('refuses a weapon somebody already took', () => {
    const state = pickWeapon(newVersus(), 0, 2)
    expect(() => pickWeapon(state, 1, 2)).toThrow('That weapon is already taken')
  })
})

describe('dealAllWeapons', () => {
  it('fills both arsenals from the pool and starts the battle', () => {
    const state = dealAllWeapons(newVersus(3))
    expect(state.phase).toBe('playing')
    expect(state.inventories.map((items) => items.length)).toEqual([3, 3])
    expect(state.shop.takenBy.filter((owner) => owner !== null)).toHaveLength(6)
  })

  it('only hands out weapons that were on offer', () => {
    const state = dealAllWeapons(newVersus(3))
    const taken = state.shop.pool.filter((_, slot) => state.shop.takenBy[slot] !== null)
    expect([...state.inventories[0], ...state.inventories[1]].sort()).toEqual(taken.sort())
  })
})

describe('enableAutoPick', () => {
  it('fills the whole arsenal when the opponent also auto-picks', () => {
    const state = enableAutoPick(enableAutoPick(newVersus(3), 0), 1)
    expect(state.phase).toBe('playing')
    expect(state.inventories.map((items) => items.length)).toEqual([3, 3])
  })

  it('picks for the auto player whenever it is their turn', () => {
    let state = enableAutoPick(newVersus(3), 0)
    expect(state.inventories[0]).toHaveLength(1)
    expect(state.shop.picker).toBe(1)

    state = pickWeapon(state, 1, openSlots(state.shop)[0]!)
    expect(state.inventories[0]).toHaveLength(2)
    expect(state.shop.picker).toBe(1)
  })

  it('is deterministic for the match seed', () => {
    expect(enableAutoPick(newVersus(3), 0)).toEqual(enableAutoPick(newVersus(3), 0))
  })

  it('is only allowed during the draft', () => {
    expect(() => enableAutoPick(finishShop(newVersus()), 0)).toThrow(MatchRuleError)
  })
})

describe('turns', () => {
  it('moves the active tank and spends a move', () => {
    const state = withGround(finishShop(newVersus()), () => 200)
    const moved = moveTank(state, 0, 1)
    expect(moved.tanks[0].x).toBeCloseTo(state.tanks[0].x + TANK.moveDistance)
    expect(moved.tanks[0].movesLeft).toBe(state.tanks[0].movesLeft - 1)
  })

  it('refuses a move that cannot gain a single pixel and keeps the move', () => {
    const state = finishShop(newVersus())
    const x = state.tanks[0].x
    // Flat ground with a sheer wall touching the tank's front track.
    const wallAt = Math.floor(x + TANK.halfTrack + 1)
    const walled = withGround(state, (column) => (column >= wallAt ? 280 : 200))
    expect(() => moveTank(walled, 0, 1)).toThrow('A wall is in the way')
    expect(walled.tanks[0].movesLeft).toBe(state.tanks[0].movesLeft)
  })

  it('rejects actions from the waiting player', () => {
    const state = finishShop(newVersus())
    expect(() => moveTank(state, 1, 1)).toThrow(MatchRuleError)
    expect(() => fire(state, 1, { angle: 45, power: 50, slot: 0 }, registry)).toThrow(
      MatchRuleError,
    )
  })

  it('clamps the elevation to the barrel range', () => {
    const state = aimTank(finishShop(newVersus()), 0, 400, -20)
    expect(state.tanks[0].angle).toBe(AIM.maxElevation)
    expect(state.tanks[0].power).toBe(0)
    expect(aimTank(finishShop(newVersus()), 0, -400, 50).tanks[0].angle).toBe(AIM.minElevation)
  })

  it('keeps the elevation when the tank moves, so the barrel leans with the new slope', () => {
    // Flat where the tank stands, then a gentle rise it can drive onto.
    const start = finishShop(newVersus())
    const rise = Math.floor(start.tanks[0].x) + 30
    const state = withGround(start, (column) => 200 + Math.max(0, column - rise) * 0.4)
    const before = barrelDirection(state.tanks[0], Terrain.fromLayers(state.terrain))
    const moved = moveTank(moveTank(state, 0, 1), 0, 1)
    expect(moved.tanks[0].angle).toBe(state.tanks[0].angle)
    const after = barrelDirection(moved.tanks[0], Terrain.fromLayers(moved.terrain))
    const tiltChange =
      tankPose(moved.tanks[0], Terrain.fromLayers(moved.terrain)).tilt -
      tankPose(state.tanks[0], Terrain.fromLayers(state.terrain)).tilt
    expect(after - before).toBeCloseTo(tiltChange)
  })

  it('records fired weapons as spent', () => {
    const state = finishShop(newVersus())
    const weapon = state.inventories[0][0]
    const next = fire(state, 0, { angle: 80, power: 40, slot: 0 }, registry).state
    expect(next.spent[0]).toEqual([weapon])
    expect(next.inventories[0]).toHaveLength(state.inventories[0].length - 1)
  })

  it('consumes the weapon, passes the turn and ends after the last shot', () => {
    let state = finishShop(newVersus())
    const order: number[] = []
    while (state.phase === 'playing') {
      order.push(state.turn)
      state = fire(state, state.turn, { angle: 80, power: 40, slot: 0 }, registry).state
    }
    expect(order).toEqual([0, 1, 0, 1])
    expect(state.phase).toBe('over')
    expect(state.inventories).toEqual([[], []])
    expect(state.result).not.toBeNull()
  })

  it('keeps weapons and the turn in practice mode', () => {
    const state = createMatch({ mode: 'practice', players, seed: 3 }, registry)
    const next = fire(state, 0, { angle: 60, power: 50, slot: 0 }, registry).state
    expect(next.turn).toBe(0)
    expect(next.inventories[0]).toEqual(state.inventories[0])
    expect(next.shotCount).toBe(1)
  })
})

describe('combo streak', () => {
  it('grows the multiplier by a quarter per scoring shot, up to three', () => {
    expect([0, 1, 2, 3, 9].map(comboMultiplier)).toEqual([1, 1.25, 1.5, 1.75, 1.75])
  })

  it('adds the bonus for a streak and resets it on a miss', () => {
    const base = finishShop(newVersus())
    const onStreak = { ...base, streaks: [2, 0] as const }
    const hit = findScoringShot(onStreak)
    const plain = fire(base, 0, hit, registry)
    const boosted = fire(onStreak, 0, hit, registry)

    expect(plain.comboBonus).toBe(0)
    expect(boosted.comboBonus).toBe(Math.round(plain.shot.scoreDelta[0] * 0.5))
    expect(boosted.state.tanks[0].score).toBe(plain.state.tanks[0].score + boosted.comboBonus)
    expect(boosted.state.streaks[0]).toBe(3)

    const miss = fire(onStreak, 0, { angle: 170, power: 100, slot: 0 }, registry)
    expect(miss.state.streaks[0]).toBe(0)
  })
})

/** Searches for an aim that scores with the first weapon in player 0's inventory. */
function findScoringShot(state: MatchState) {
  for (let angle = 20; angle <= 80; angle += 2) {
    for (let power = 30; power <= 100; power += 2) {
      const command = { angle, power, slot: 0 }
      if (fire(state, 0, command, registry).shot.scoreDelta[0] > 0) return command
    }
  }
  throw new Error('No scoring shot found')
}

describe('replayShot', () => {
  it('reproduces exactly the shot that fire resolved', () => {
    const state = finishShop(newVersus())
    const outcome = fire(state, 0, { angle: 55, power: 62, slot: 0 }, registry)
    expect(replayShot(state, 0, outcome.input, registry)).toEqual(outcome.shot)
  })
})
