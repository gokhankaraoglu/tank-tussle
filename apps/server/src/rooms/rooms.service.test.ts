import { beforeEach, describe, expect, it } from 'vitest'
import { DomainError } from '../common/domain-error.js'
import { InMemoryRoomRepository } from './room.repository.js'
import { RoomsService } from './rooms.service.js'

const alice = { name: 'Alice', color: '#ff0000' }
const bob = { name: 'Bob', color: '#0000ff' }
const publicGame = { visibility: 'public', weaponsPerPlayer: 10 } as const
const GRACE = 30_000

describe('RoomsService', () => {
  let now: number
  let rooms: RoomsService

  beforeEach(() => {
    now = 1_000
    rooms = new RoomsService(new InMemoryRoomRepository(), () => now)
  })

  const startedGame = () => {
    const { room, token } = rooms.create('s1', alice, publicGame)
    const guest = rooms.join(room.id, 's2', bob)
    rooms.start('s1')
    return { roomId: room.id, hostToken: token, guestToken: guest.token }
  }

  describe('lobby', () => {
    it('creates a waiting room with a readable code and a secret seat token', () => {
      const { room, player, token } = rooms.create('s1', alice, publicGame)
      expect(room.id).toMatch(/^[a-z2-9]{6}$/)
      expect(room.id).not.toMatch(/[01ilo]/)
      expect(player).toBe(0)
      expect(token).toHaveLength(36)
      expect(rooms.listOpen()).toEqual([
        { id: room.id, hostName: 'Alice', hostColor: '#ff0000', weaponsPerPlayer: 10 },
      ])
    })

    it('hides private rooms from the list but lets people join by code', () => {
      const { room } = rooms.create('s1', alice, { ...publicGame, visibility: 'private' })
      expect(rooms.listOpen()).toEqual([])
      expect(rooms.join(room.id, 's2', bob).player).toBe(1)
    })

    it.each([
      ['an unknown code', () => rooms.join('zzzzzz', 's2', bob), 'No game with that code'],
      [
        'a full room',
        () => {
          const { room } = rooms.create('s1', alice, publicGame)
          rooms.join(room.id, 's2', bob)
          return rooms.join(room.id, 's3', bob)
        },
        'That game is already full',
      ],
      [
        'a second room while seated',
        () => {
          rooms.create('s1', alice, publicGame)
          return rooms.create('s1', alice, publicGame)
        },
        'Leave your current game first',
      ],
    ])('rejects joining %s', (_, action, message) => {
      expect(action).toThrow(new DomainError(message))
    })
  })

  it('gives the guest another colour when it clashes with the host', () => {
    const { room } = rooms.create('s1', alice, publicGame)
    const joined = rooms.join(room.id, 's2', { ...bob, color: alice.color })
    expect(joined.room.guest?.profile.color).not.toBe(alice.color)
  })

  describe('start', () => {
    it('only lets the host start once a guest is present', () => {
      const { room } = rooms.create('s1', alice, publicGame)
      expect(() => rooms.start('s1')).toThrow('Wait for an opponent to join')
      rooms.join(room.id, 's2', bob)
      expect(() => rooms.start('s2')).toThrow('Only the host can start the game')
      expect(rooms.start('s1').status).toBe('playing')
    })
  })

  describe('leave', () => {
    it('frees the seat when a guest leaves a waiting room', () => {
      const { room } = rooms.create('s1', alice, publicGame)
      rooms.join(room.id, 's2', bob)
      const result = rooms.leave('s2')
      expect(result?.kind).toBe('seat-freed')
      expect(rooms.listOpen()).toHaveLength(1)
    })

    it('closes a waiting room when the host leaves', () => {
      const { room } = rooms.create('s1', alice, publicGame)
      rooms.join(room.id, 's2', bob)
      const result = rooms.leave('s1')
      expect(result).toMatchObject({
        kind: 'closed',
        reason: 'host-left',
        notify: { socketId: 's2' },
      })
    })

    it('closes a running game when either player leaves', () => {
      startedGame()
      expect(rooms.leave('s2')).toMatchObject({ kind: 'closed', reason: 'opponent-left' })
      expect(() => rooms.seatOf('s1')).toThrow(DomainError)
    })
  })

  describe('reconnection', () => {
    it('keeps the seat of a disconnected player until the deadline', () => {
      const { hostToken } = startedGame()
      const result = rooms.disconnect('s1', GRACE)
      expect(result).toMatchObject({ kind: 'disconnected', player: 0, token: hostToken })
      if (result?.kind !== 'disconnected') return
      expect(result.room.host).toMatchObject({ socketId: null, reconnectDeadline: now + GRACE })
    })

    it('lets the player reclaim the seat from a new socket', () => {
      const { roomId, guestToken } = startedGame()
      rooms.disconnect('s2', GRACE)

      const resumed = rooms.resume(guestToken, 's9')
      expect(resumed.player).toBe(1)
      expect(resumed.room.id).toBe(roomId)
      expect(rooms.seatOf('s9').player).toBe(1)
      expect(rooms.expire(guestToken)).toBeNull()
    })

    it('lets a second tab take over a seat that is still connected', () => {
      const { hostToken } = startedGame()
      const resumed = rooms.resume(hostToken, 's9')
      expect(resumed.previousSocketId).toBe('s1')
      expect(() => rooms.seatOf('s1')).toThrow(DomainError)
    })

    it('closes the room when the grace period runs out', () => {
      const { guestToken } = startedGame()
      rooms.disconnect('s2', GRACE)
      expect(rooms.expire(guestToken)).toMatchObject({
        kind: 'closed',
        reason: 'opponent-timed-out',
        notify: { socketId: 's1' },
      })
      expect(() => rooms.resume(guestToken, 's3')).toThrow('That game is no longer available')
    })

    it('drops a guest who disconnects before the game starts', () => {
      const { room } = rooms.create('s1', alice, publicGame)
      rooms.join(room.id, 's2', bob)
      expect(rooms.disconnect('s2', GRACE)?.kind).toBe('seat-freed')
    })

    it('hides a waiting room while its host is away', () => {
      rooms.create('s1', alice, publicGame)
      rooms.disconnect('s1', GRACE)
      expect(rooms.listOpen()).toEqual([])
    })
  })
})
