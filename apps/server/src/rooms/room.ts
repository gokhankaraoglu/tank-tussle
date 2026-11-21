import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import type {
  RoomSettings,
  RoomStatus,
  RoomSummary,
  RoomView,
  SeatView,
  WeaponsPerPlayer,
} from '@tank-tussle/protocol'

export interface Seat {
  /** Secret that lets the owner reclaim the seat after a disconnect. */
  readonly token: string
  /** Null while the owner is disconnected. */
  readonly socketId: string | null
  readonly profile: PlayerProfile
  readonly reconnectDeadline: number | null
}

export interface Room {
  readonly id: string
  readonly settings: RoomSettings
  readonly status: RoomStatus
  readonly host: Seat
  readonly guest: Seat | null
  readonly createdAt: number
}

/** A room whose match has started: both seats are taken. */
export type StartedRoom = Room & { readonly guest: Seat }

export interface SeatAssignment {
  readonly room: Room
  readonly player: PlayerIndex
}

export const seatAt = (room: Room, player: PlayerIndex): Seat | null =>
  player === 0 ? room.host : room.guest

export const withSeat = (room: Room, player: PlayerIndex, seat: Seat | null): Room =>
  player === 0 ? { ...room, host: seat ?? room.host } : { ...room, guest: seat }

export const playerOfSocket = (room: Room, socketId: string): PlayerIndex | null => {
  if (room.host.socketId === socketId) return 0
  return room.guest?.socketId === socketId ? 1 : null
}

export const playerOfToken = (room: Room, token: string): PlayerIndex | null => {
  if (room.host.token === token) return 0
  return room.guest?.token === token ? 1 : null
}

export type ConnectedSeat = Seat & { readonly socketId: string }

export const isConnected = (seat: Seat | null): seat is ConnectedSeat => seat?.socketId != null

const toSeatView = (seat: Seat): SeatView => ({
  name: seat.profile.name,
  color: seat.profile.color,
  connected: seat.socketId !== null,
  reconnectDeadline: seat.reconnectDeadline,
})

export const toRoomView = (room: Room): RoomView => ({
  id: room.id,
  settings: room.settings,
  status: room.status,
  host: toSeatView(room.host),
  guest: room.guest ? toSeatView(room.guest) : null,
})

export const toRoomSummary = (room: Room): RoomSummary => ({
  id: room.id,
  hostName: room.host.profile.name,
  hostColor: room.host.profile.color,
  weaponsPerPlayer: room.settings.weaponsPerPlayer as WeaponsPerPlayer,
})
