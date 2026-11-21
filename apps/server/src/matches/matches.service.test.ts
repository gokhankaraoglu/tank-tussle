import { createDefaultWeaponRegistry } from '@tank-tussle/game-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { DomainError } from '../common/domain-error.js'
import { MatchesService } from './matches.service.js'

const players = [
  { name: 'Alice', color: '#ff0000' },
  { name: 'Bob', color: '#0000ff' },
] as const

describe('MatchesService', () => {
  let matches: MatchesService

  beforeEach(() => {
    matches = new MatchesService(createDefaultWeaponRegistry(), () => 42)
  })

  const playToTheEnd = (roomId: string): void => {
    matches.start(roomId, players)
    let state = matches.dealAll(roomId)
    while (state.phase === 'playing') {
      state = matches.fire(roomId, state.turn, { angle: 80, power: 30, slot: 0 }).state
    }
  }

  it('starts a seeded versus match in the shop', () => {
    const state = matches.start('room', players)
    expect(state.phase).toBe('shop')
    expect(state.config.seed).toBe(42)
  })

  it('applies actions to the stored state', () => {
    matches.start('room', players)
    const state = matches.pick('room', 0, 0)
    expect(state.inventories[0]).toHaveLength(1)
  })

  it('needs both votes before a rematch starts', () => {
    playToTheEnd('room')
    expect(matches.requestRematch('room', 0)).toEqual({ started: false })
    const result = matches.requestRematch('room', 1)
    expect(result.started).toBe(true)
  })

  it('refuses a rematch while playing', () => {
    matches.start('room', players)
    expect(() => matches.requestRematch('room', 0)).toThrow(DomainError)
  })

  it('uses the requested arsenal size and keeps it for the rematch', () => {
    const state = matches.start('room', players, { weaponsPerPlayer: 5 })
    expect(state.config.weaponsPerPlayer).toBe(5)
    expect(state.shop.pool).toHaveLength(10)
  })

  it('exposes the current state and rematch votes', () => {
    expect(matches.find('room')).toBeNull()
    matches.start('room', players)
    expect(matches.find('room')).toMatchObject({ rematchRequestedBy: [] })
  })

  it('deals the remaining weapons to both players', () => {
    matches.start('room', players, { weaponsPerPlayer: 5 })
    matches.pick('room', 0, 0)
    const state = matches.dealAll('room')
    expect(state.phase).toBe('playing')
    expect(state.inventories.map((items) => items.length)).toEqual([5, 5])
  })

  it('forgets ended matches', () => {
    matches.start('room', players)
    matches.end('room')
    expect(() => matches.pick('room', 0, 0)).toThrow('No match is running in this room')
  })
})
