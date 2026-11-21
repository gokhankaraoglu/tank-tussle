import type { MatchState } from '@tank-tussle/game-core'
import { ServerEvent, type RoomClosedReason } from '@tank-tussle/protocol'
import { isConnected, toRoomView, type Room, type Seat } from '../rooms/room.js'
import type { RoomsService } from '../rooms/rooms.service.js'
import type { GameServer } from './socket-types.js'

/** Outgoing messages about rooms and matches. Keeps "who gets told what" in one place. */
export class RoomBroadcaster {
  constructor(
    private readonly server: GameServer,
    private readonly rooms: RoomsService,
  ) {}

  roomUpdated(room: Room): void {
    this.server.to(room.id).emit(ServerEvent.RoomUpdated, { room: toRoomView(room) })
  }

  roomClosed(room: Room, notify: Seat | null, reason: RoomClosedReason): void {
    if (notify?.socketId) this.server.to(notify.socketId).emit(ServerEvent.RoomClosed, { reason })
    this.server.in(room.id).socketsLeave(room.id)
  }

  matchStarted(room: Room, state: MatchState): void {
    const seats: [Seat, Seat | null] = [room.host, room.guest]
    seats.forEach((seat, you) => {
      if (isConnected(seat)) {
        this.server.to(seat.socketId).emit(ServerEvent.MatchStarted, { state, you: you as 0 | 1 })
      }
    })
  }

  openRooms(): void {
    this.server.emit(ServerEvent.Rooms, this.rooms.listOpen())
  }
}
