import type { RoomView } from '@tank-tussle/protocol'
import { describe, expect, it, vi } from 'vitest'
import type { ConnectionStatus } from '../network/online-connection.js'
import { findQuickMatch, QUICK_MATCH } from './quick-match.js'

const profile = { name: 'Ada', color: '#ff7849' }
const room = (id: string): RoomView => ({
  id,
  settings: QUICK_MATCH.settings,
  status: 'waiting',
  host: { name: 'Host', color: '#3ddcff', connected: true, reconnectDeadline: null },
  guest: null,
})
const joined = (id: string, you: 0 | 1) => ({
  ok: true as const,
  data: { room: room(id), you, credentials: { roomId: id, token: 't' } },
})

const fakeConnection = (status: ConnectionStatus, open: string[] = []) => {
  let current = status
  const listeners = new Set<(status: ConnectionStatus) => void>()
  return {
    getStatus: () => current,
    onStatus: (listener: (status: ConnectionStatus) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    listRooms: vi.fn(() =>
      Promise.resolve(
        open.map((id) => ({
          id,
          hostName: 'Host',
          hostColor: '#3ddcff',
          weaponsPerPlayer: 5 as const,
        })),
      ),
    ),
    joinRoom: vi.fn((id: string) => Promise.resolve(joined(id, 1))),
    createRoom: vi.fn(() => Promise.resolve(joined('mine00', 0))),
    setStatus: (next: ConnectionStatus) => {
      current = next
      listeners.forEach((listener) => listener(next))
    },
  }
}

describe('findQuickMatch', () => {
  it('joins the first open game', async () => {
    const connection = fakeConnection('connected', ['abc234', 'def567'])
    const result = await findQuickMatch(connection, profile)

    expect(result).toMatchObject({ kind: 'room', you: 1 })
    expect(connection.joinRoom).toHaveBeenCalledExactlyOnceWith('abc234', profile)
    expect(connection.createRoom).not.toHaveBeenCalled()
  })

  it('tries the next game when one is already full', async () => {
    const connection = fakeConnection('connected', ['full00', 'abc234'])
    connection.joinRoom.mockImplementationOnce(() =>
      Promise.resolve({ ok: false as const, error: 'Room is full' } as never),
    )
    const result = await findQuickMatch(connection, profile)
    expect(result).toMatchObject({ kind: 'room', room: { id: 'abc234' } })
  })

  it('hosts a public game when nobody is waiting', async () => {
    const connection = fakeConnection('connected')
    const result = await findQuickMatch(connection, profile)

    expect(result).toMatchObject({ kind: 'room', you: 0 })
    expect(connection.createRoom).toHaveBeenCalledWith(profile, QUICK_MATCH.settings)
  })

  it('waits for the connection to come up', async () => {
    const connection = fakeConnection('connecting')
    const pending = findQuickMatch(connection, profile)
    connection.setStatus('connected')
    expect(await pending).toMatchObject({ kind: 'room' })
  })

  it('gives up when the server is unreachable or too slow', async () => {
    expect(await findQuickMatch(fakeConnection('offline'), profile)).toEqual({
      kind: 'unavailable',
    })
    expect(await findQuickMatch(fakeConnection('connecting'), profile, 10)).toEqual({
      kind: 'unavailable',
    })
  })
})
