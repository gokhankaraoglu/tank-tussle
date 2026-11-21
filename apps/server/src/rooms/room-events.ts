import type { PlayerIndex } from '@tank-tussle/game-core'
import type { RoomClosedReason } from '@tank-tussle/protocol'
import type { Room, Seat } from './room.js'

/** What changed after a seat left, so the transport knows whom to tell what. */
export type DepartureResult =
  | {
      readonly kind: 'closed'
      readonly room: Room
      /** The other player, who should be told why the room closed. */
      readonly notify: Seat | null
      readonly reason: RoomClosedReason
    }
  | { readonly kind: 'seat-freed'; readonly room: Room; readonly socketId: string }

export interface DisconnectResult {
  readonly kind: 'disconnected'
  readonly room: Room
  readonly player: PlayerIndex
  readonly token: string
}

export interface JoinResult {
  readonly room: Room
  readonly player: PlayerIndex
  readonly token: string
}
