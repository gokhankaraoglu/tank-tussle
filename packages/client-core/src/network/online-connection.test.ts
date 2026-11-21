import { ClientEvent } from '@tank-tussle/protocol'
import { describe, expect, it, vi } from 'vitest'
import { memoryCredentialsStore } from './credentials-store.js'
import type { GameSocket } from './game-socket.js'
import { OnlineConnection } from './online-connection.js'

/** Just enough of a socket.io client to drive OnlineConnection. */
class FakeSocket {
  connected = false
  private readonly handlers = new Map<string, ((...args: unknown[]) => void)[]>()
  readonly emitted: unknown[][] = []
  ackReplies = new Map<string, unknown>()

  on(event: string, handler: (...args: unknown[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler])
    return this
  }
  off() {
    return this
  }
  removeAllListeners() {
    this.handlers.clear()
    return this
  }
  emit(...args: unknown[]) {
    this.emitted.push(args)
    return this
  }
  emitWithAck(event: string) {
    return Promise.resolve(this.ackReplies.get(event))
  }
  disconnect() {
    return this
  }
  fire(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach((handler) => handler(...args))
  }
}

const joined = {
  ok: true,
  data: { room: { id: 'abc234' }, you: 0, credentials: { roomId: 'abc234', token: 'secret' } },
}

const setup = () => {
  const socket = new FakeSocket()
  const credentials = memoryCredentialsStore()
  const connection = new OnlineConnection(socket as unknown as GameSocket, credentials)
  return { socket, credentials, connection }
}

describe('OnlineConnection', () => {
  it('tracks the connection status', () => {
    const { socket, connection } = setup()
    const statuses: string[] = []
    connection.onStatus((status) => statuses.push(status))

    socket.fire('connect')
    socket.fire('disconnect')
    expect(statuses).toEqual(['connected', 'reconnecting'])
  })

  it('stops retrying and reports an outdated server on a protocol mismatch', () => {
    const { socket, connection } = setup()
    socket.fire('connect_error', new Error('PROTOCOL_MISMATCH'))
    expect(connection.getStatus()).toBe('outdated')
  })

  it('remembers the seat token after creating a room', async () => {
    const { socket, credentials, connection } = setup()
    socket.ackReplies.set(ClientEvent.CreateRoom, joined)
    await connection.createRoom(
      { name: 'Ada', color: '#ffffff' },
      { visibility: 'public', weaponsPerPlayer: 10 },
    )
    expect(credentials.load()).toEqual({ roomId: 'abc234', token: 'secret' })
  })

  it('resumes automatically after a reconnect', async () => {
    const { socket, credentials, connection } = setup()
    credentials.save({ roomId: 'abc234', token: 'secret' })
    socket.ackReplies.set(ClientEvent.Resume, {
      ok: true,
      data: { room: {}, you: 1, match: null, rematchRequestedBy: [] },
    })
    const resumed = vi.fn()
    connection.onResumed(resumed)

    socket.fire('connect')
    expect(resumed).not.toHaveBeenCalled()
    socket.fire('disconnect')
    socket.fire('connect')
    await vi.waitFor(() =>
      expect(resumed).toHaveBeenCalledWith(expect.objectContaining({ ok: true })),
    )
  })

  it('forgets the seat when the server no longer knows it', async () => {
    const { socket, credentials, connection } = setup()
    credentials.save({ roomId: 'abc234', token: 'secret' })
    socket.ackReplies.set(ClientEvent.Resume, {
      ok: false,
      error: 'That game is no longer available',
    })
    expect(await connection.resume()).toEqual({
      ok: false,
      error: 'That game is no longer available',
    })
    expect(credentials.load()).toBeNull()
  })

  it('leaves the room on dispose when it still holds a seat', () => {
    const { socket, credentials, connection } = setup()
    credentials.save({ roomId: 'abc234', token: 'secret' })
    connection.dispose()
    expect(socket.emitted).toContainEqual([ClientEvent.LeaveRoom])
    expect(credentials.load()).toBeNull()
  })

  it('keeps a match that started before anyone listened, once', () => {
    const socket = new FakeSocket()
    const connection = new OnlineConnection(
      socket as unknown as GameSocket,
      memoryCredentialsStore(),
    )
    const payload = { state: {}, you: 1 }
    socket.fire('match:started', payload)

    expect(connection.takeStartedMatch()).toBe(payload)
    expect(connection.takeStartedMatch()).toBeNull()
  })

  it('forgets a pending match start when leaving the room', () => {
    const socket = new FakeSocket()
    const connection = new OnlineConnection(
      socket as unknown as GameSocket,
      memoryCredentialsStore(),
    )
    socket.fire('match:started', { state: {}, you: 1 })
    connection.leaveRoom()
    expect(connection.takeStartedMatch()).toBeNull()
  })
})
