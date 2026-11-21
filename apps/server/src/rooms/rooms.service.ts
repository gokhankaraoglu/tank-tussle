import { randomBytes, randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { opponentOf, type PlayerIndex, type PlayerProfile } from '@tank-tussle/game-core'
import {
  distinctColor,
  ROOM_OPTIONS,
  type RoomClosedReason,
  type RoomSettings,
  type RoomSummary,
} from '@tank-tussle/protocol'
import { DomainError } from '../common/domain-error.js'
import {
  isConnected,
  playerOfSocket,
  playerOfToken,
  seatAt,
  toRoomSummary,
  withSeat,
  type Room,
  type Seat,
  type SeatAssignment,
  type StartedRoom,
} from './room.js'
import type { DepartureResult, DisconnectResult, JoinResult } from './room-events.js'
import { ROOM_REPOSITORY, type RoomRepository } from './room.repository.js'
import { CLOCK, type Clock } from './tokens.js'

const DEFAULT_LIST_LIMIT = 10
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** Lobby rules: room lifecycle, seats, and reclaiming seats after a disconnect. */
@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly repository: RoomRepository,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  create(socketId: string, profile: PlayerProfile, settings: RoomSettings): JoinResult {
    this.assertNotSeated(socketId)
    const host = this.newSeat(socketId, profile)
    const room: Room = {
      id: this.generateCode(),
      settings,
      status: 'waiting',
      host,
      guest: null,
      createdAt: this.now(),
    }
    this.repository.save(room)
    return { room, player: 0, token: host.token }
  }

  join(roomId: string, socketId: string, profile: PlayerProfile): JoinResult {
    this.assertNotSeated(socketId)
    const room = this.repository.findById(roomId)
    if (!room) throw new DomainError('No game with that code')
    if (room.guest || room.status !== 'waiting') throw new DomainError('That game is already full')

    // Two tanks of the same colour would be impossible to tell apart.
    const color = distinctColor(profile.color, room.host.profile.color)
    const guest = this.newSeat(socketId, { ...profile, color })
    const joined = withSeat(room, 1, guest)
    this.repository.save(joined)
    return { room: joined, player: 1, token: guest.token }
  }

  /** Host only: locks the room and lets the match begin. */
  start(socketId: string): StartedRoom {
    const { room, player } = this.seatOf(socketId)
    if (player !== 0) throw new DomainError('Only the host can start the game')
    if (room.status !== 'waiting') throw new DomainError('The game has already started')
    const guest = room.guest
    if (!isConnected(guest)) throw new DomainError('Wait for an opponent to join')

    const started: StartedRoom = { ...room, guest, status: 'playing' }
    this.repository.save(started)
    return started
  }

  /** Deliberate exit. A guest leaving a waiting room frees the seat; anything else closes it. */
  leave(socketId: string): DepartureResult | null {
    const room = this.repository.findBySocket(socketId)
    const player = room ? playerOfSocket(room, socketId) : null
    if (!room || player === null) return null

    if (player === 1 && room.status === 'waiting') {
      const freed = withSeat(room, 1, null)
      this.repository.save(freed)
      return { kind: 'seat-freed', room: freed, socketId }
    }
    return this.close(
      room,
      seatAt(room, opponentOf(player)),
      closeReason(room, player, 'opponent-left'),
    )
  }

  /** Lost connection: keep the seat for `graceMs` so the player can come back. */
  disconnect(socketId: string, graceMs: number): DepartureResult | DisconnectResult | null {
    const room = this.repository.findBySocket(socketId)
    const player = room ? playerOfSocket(room, socketId) : null
    if (!room || player === null) return null
    if (player === 1 && room.status === 'waiting') return this.leave(socketId)

    const seat = seatAt(room, player)!
    const updated = withSeat(room, player, {
      ...seat,
      socketId: null,
      reconnectDeadline: this.now() + graceMs,
    })
    this.repository.save(updated)
    return { kind: 'disconnected', room: updated, player, token: seat.token }
  }

  /** Re-attaches a socket to the seat identified by `token`. */
  resume(
    token: string,
    socketId: string,
  ): SeatAssignment & { readonly previousSocketId: string | null } {
    const room = this.repository.findByToken(token)
    const player = room ? playerOfToken(room, token) : null
    if (!room || player === null) throw new DomainError('That game is no longer available')

    const seat = seatAt(room, player)!
    const resumed = withSeat(room, player, { ...seat, socketId, reconnectDeadline: null })
    this.repository.save(resumed)
    return { room: resumed, player, previousSocketId: seat.socketId }
  }

  /** Called when the grace period ends. No-op if the player already came back. */
  expire(token: string): DepartureResult | null {
    const room = this.repository.findByToken(token)
    const player = room ? playerOfToken(room, token) : null
    if (!room || player === null || isConnected(seatAt(room, player))) return null
    return this.close(
      room,
      seatAt(room, opponentOf(player)),
      closeReason(room, player, 'opponent-timed-out'),
    )
  }

  seatOf(socketId: string): SeatAssignment {
    const room = this.repository.findBySocket(socketId)
    const player = room ? playerOfSocket(room, socketId) : null
    if (!room || player === null) throw new DomainError('You are not in a game')
    return { room, player }
  }

  findById(roomId: string): Room | undefined {
    return this.repository.findById(roomId)
  }

  /** Public rooms that are waiting for a guest and whose host is online. */
  listOpen(limit = DEFAULT_LIST_LIMIT): RoomSummary[] {
    return this.repository
      .findAll()
      .filter(
        (room) =>
          room.settings.visibility === 'public' &&
          room.status === 'waiting' &&
          room.guest === null &&
          isConnected(room.host),
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(toRoomSummary)
  }

  private close(room: Room, other: Seat | null, reason: RoomClosedReason): DepartureResult {
    this.repository.delete(room.id)
    return { kind: 'closed', room, notify: isConnected(other) ? other : null, reason }
  }

  private newSeat(socketId: string, profile: PlayerProfile): Seat {
    return { token: randomUUID(), socketId, profile, reconnectDeadline: null }
  }

  private assertNotSeated(socketId: string): void {
    if (this.repository.findBySocket(socketId))
      throw new DomainError('Leave your current game first')
  }

  /** Short, unambiguous codes (no 0/o, 1/l/i) that are easy to read out loud. */
  private generateCode(): string {
    let code: string
    do {
      code = [...randomBytes(ROOM_OPTIONS.codeLength)]
        .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
        .join('')
    } while (this.repository.findById(code))
    return code
  }
}

/** A host abandoning a lobby closes it for the guest; during a match it is the opponent leaving. */
const closeReason = (
  room: Room,
  leaver: PlayerIndex,
  duringMatch: RoomClosedReason,
): RoomClosedReason => (leaver === 0 && room.status === 'waiting' ? 'host-left' : duringMatch)
