import { describe, expect, it } from 'vitest'
import { createRng } from '../random/rng.js'
import { predictImpact } from '../simulation/trajectory.js'
import { flatLayers, Terrain } from '../terrain/terrain.js'
import { flatHeights, tanksAt } from '../test-helpers.js'
import { createDefaultWeaponRegistry } from '../weapons/registry.js'
import { createMatch } from '../match/match.js'
import type { MatchState } from '../match/types.js'
import { chooseCpuPick, chooseCpuShot } from './cpu-player.js'

const registry = createDefaultWeaponRegistry()

const flatMatch = (): MatchState => ({
  ...createMatch(
    {
      mode: 'practice',
      players: [
        { name: 'A', color: '#ffffff' },
        { name: 'B', color: '#000000' },
      ],
      seed: 5,
    },
    registry,
  ),
  terrain: flatLayers(flatHeights()),
  tanks: tanksAt(150, 800),
  inventories: [['peashooter'], ['peashooter', 'thumper']],
})

describe('chooseCpuShot', () => {
  it('lands a max-level shot close to the target', () => {
    const state = flatMatch()
    const shot = chooseCpuShot(state, 1, 8, registry, createRng(1))
    const impact = predictImpact(
      Terrain.fromLayers(state.terrain),
      state.tanks,
      1,
      shot.angle,
      shot.power,
    )
    expect(impact).not.toBeNull()
    expect(Math.abs(impact!.point.x - 150)).toBeLessThan(25)
  })

  it('aims away from itself towards the opponent', () => {
    const shot = chooseCpuShot(flatMatch(), 1, 8, registry, createRng(1))
    expect(shot.angle).toBeGreaterThan(90)
  })

  it('prefers its strongest weapon at high levels', () => {
    const shot = chooseCpuShot(flatMatch(), 1, 8, registry, createRng(1))
    expect(shot.slot).toBe(1)
  })
})

describe('chooseCpuPick', () => {
  it('takes the highest-rated weapon nobody has taken yet', () => {
    const state = {
      ...flatMatch(),
      shop: {
        pool: ['peashooter', 'bloodhound', 'thumper', 'bloodhound'],
        takenBy: [null, 0 as const, null, null],
        picker: 1 as const,
        autoPickers: [],
      },
    }
    expect(chooseCpuPick(state, registry)).toBe(3)
  })
})
