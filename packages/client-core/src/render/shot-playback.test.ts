import {
  createDefaultWeaponRegistry,
  createMatch,
  fire,
  dealAllWeapons,
  type MatchState,
} from '@tank-tussle/game-core'
import { describe, expect, it } from 'vitest'
import type { PendingShot } from '../session/game-session.js'
import { ShotPlayback } from './shot-playback.js'

const registry = createDefaultWeaponRegistry()

const armedMatch = (): MatchState => {
  let state = createMatch(
    {
      mode: 'versus',
      players: [
        { name: 'A', color: '#ff0000' },
        { name: 'B', color: '#0000ff' },
      ],
      seed: 3,
      weaponsPerPlayer: 1,
      shopSize: 2,
    },
    registry,
  )
  state = dealAllWeapons(state)
  return state
}

describe('ShotPlayback', () => {
  const state = armedMatch()
  const outcome = fire(state, 0, { angle: 60, power: 55, slot: 0 }, registry)
  const shot: PendingShot = {
    id: 1,
    player: 0,
    input: outcome.input,
    result: outcome.shot,
    finalState: outcome.state,
  }
  const playback = new ShotPlayback(
    shot,
    state.terrain,
    ['#ff0000', '#0000ff'],
    [state.tanks[0].x, state.tanks[1].x],
  )

  it('starts with the original terrain and ends with the final terrain', () => {
    expect(playback.frameAt(0).terrain).toBe(state.terrain)
    expect(playback.frameAt(shot.result.ticks).terrain).toEqual(outcome.state.terrain)
  })

  it('finishes some time after the last projectile', () => {
    expect(playback.isFinished(shot.result.ticks)).toBe(false)
    expect(playback.isFinished(shot.result.ticks + 1000)).toBe(true)
  })

  it('converts elapsed seconds to simulation ticks', () => {
    expect(playback.tickAt(1)).toBe(60)
  })

  it('reports each event exactly once across consecutive ranges', () => {
    const end = shot.result.ticks
    const seen = [
      ...playback.eventsBetween(-1, 10),
      ...playback.eventsBetween(10, 40),
      ...playback.eventsBetween(40, end),
    ]
    expect(seen).toEqual(shot.result.events)
    expect(playback.eventsBetween(-1, 0).map((event) => event.kind)).toContain('launch')
  })

  it("kicks the shooter's barrel back and flashes the muzzle right after launch", () => {
    const launch = shot.result.events.find((event) => event.kind === 'launch')!
    const frame = playback.frameAt(launch.tick)
    expect(frame.recoil[shot.player]).toBe(1)
    expect(frame.recoil[shot.player === 0 ? 1 : 0]).toBe(0)
    expect(frame.muzzleFlashes).toHaveLength(1)
    expect(playback.frameAt(launch.tick + 60).recoil).toEqual([0, 0])
  })
})
