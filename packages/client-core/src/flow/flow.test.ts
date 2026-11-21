import { describe, expect, it } from 'vitest'
import type { RoomView } from '@tank-tussle/protocol'
import type { OnlineConnection } from '../network/online-connection.js'
import type { GameSession } from '../session/game-session.js'
import { flowReducer, initialScreen, ownedConnection, type Screen } from './flow.js'

const connection = {} as OnlineConnection
const profile = { name: 'Ada', color: '#ff7849' }
const room: RoomView = {
  id: 'abc234',
  settings: { visibility: 'public', weaponsPerPlayer: 10 },
  status: 'waiting',
  host: { name: 'Ada', color: '#ff7849', connected: true, reconnectDeadline: null },
  guest: null,
}

describe('flowReducer', () => {
  it('walks from menu to setup to match and back', () => {
    const session = {} as GameSession
    const setup = flowReducer(initialScreen, { type: 'choose-mode', mode: 'cpu' })
    expect(setup).toEqual({ name: 'setup', mode: 'cpu' })
    const match = flowReducer(setup, { type: 'start-match', session })
    expect(match).toEqual({ name: 'match', session })
    expect(flowReducer(match, { type: 'back-to-menu' })).toBe(initialScreen)
  })

  it('moves through the online screens keeping the connection and profile', () => {
    const hub = flowReducer(initialScreen, { type: 'enter-online', connection, profile })
    const create = flowReducer(hub, { type: 'open-create-room' })
    expect(create).toEqual({ name: 'create-room', connection, profile })

    const waiting = flowReducer(create, { type: 'enter-room', room, you: 0 })
    expect(waiting).toEqual({ name: 'room', connection, room, you: 0, quick: false })

    expect(flowReducer(waiting, { type: 'back-to-online' })).toEqual({
      name: 'online',
      connection,
      profile,
    })
  })

  it('opens the menu sub-screens and returns to the menu', () => {
    const ladder = flowReducer(initialScreen, { type: 'open', screen: 'ladder' })
    expect(ladder).toEqual({ name: 'ladder' })
    expect(flowReducer(ladder, { type: 'back-to-menu' })).toBe(initialScreen)
  })

  it('carries the ladder level into the match', () => {
    const session = {} as GameSession
    const match = flowReducer({ name: 'ladder' }, { type: 'start-match', session, ladderLevel: 3 })
    expect(match).toEqual({ name: 'match', session, ladderLevel: 3 })
  })

  it('goes from quick match into a self-starting room', () => {
    const searching = flowReducer(initialScreen, { type: 'start-quick-match', connection })
    expect(ownedConnection(searching)).toBe(connection)
    const waiting = flowReducer(searching, { type: 'enter-room', room, you: 0, quick: true })
    expect(waiting).toEqual({ name: 'room', connection, room, you: 0, quick: true })
  })

  it('enters a room after resuming', () => {
    const resuming: Screen = { name: 'resuming', connection }
    expect(flowReducer(resuming, { type: 'enter-room', room, you: 0 }).name).toBe('room')
  })

  it('ignores online actions outside online screens', () => {
    expect(flowReducer(initialScreen, { type: 'open-create-room' })).toBe(initialScreen)
    expect(flowReducer(initialScreen, { type: 'enter-room', room, you: 0 })).toBe(initialScreen)
  })

  it('reports which connection a screen owns', () => {
    expect(ownedConnection({ name: 'resuming', connection })).toBe(connection)
    expect(ownedConnection(initialScreen)).toBeNull()
  })
})
