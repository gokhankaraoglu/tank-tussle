import type { MatchState, PlayerIndex } from '@tank-tussle/game-core'

export type RoomVisibility = 'public' | 'private'
export type RoomStatus = 'waiting' | 'playing'

export const ROOM_OPTIONS = {
  weaponsPerPlayer: [5, 10, 15],
  visibility: ['public', 'private'],
  codeLength: 6,
} as const

export type WeaponsPerPlayer = (typeof ROOM_OPTIONS.weaponsPerPlayer)[number]

export interface RoomSettings {
  readonly visibility: RoomVisibility
  readonly weaponsPerPlayer: WeaponsPerPlayer
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = { visibility: 'public', weaponsPerPlayer: 10 }

export interface SeatView {
  readonly name: string
  readonly color: string
  readonly connected: boolean
  /** Epoch ms after which a disconnected player forfeits their seat. */
  readonly reconnectDeadline: number | null
}

/** What every client in a room is told about it. Contains no secrets. */
export interface RoomView {
  readonly id: string
  readonly settings: RoomSettings
  readonly status: RoomStatus
  readonly host: SeatView
  readonly guest: SeatView | null
}

/** Listed in the public lobby. */
export interface RoomSummary {
  readonly id: string
  readonly hostName: string
  readonly hostColor: string
  readonly weaponsPerPlayer: WeaponsPerPlayer
}

/** Secret handed to the seat owner; presenting it later reclaims the seat. */
export interface SeatCredentials {
  readonly roomId: string
  readonly token: string
}

export interface RoomJoinedPayload {
  readonly room: RoomView
  readonly you: PlayerIndex
  readonly credentials: SeatCredentials
}

export interface ResumePayload {
  readonly room: RoomView
  readonly you: PlayerIndex
  /** Null while the room is still waiting to start. */
  readonly match: MatchState | null
  readonly rematchRequestedBy: readonly PlayerIndex[]
}

export type RoomClosedReason = 'host-left' | 'opponent-left' | 'opponent-timed-out'

export const ROOM_CLOSED_MESSAGES: Record<RoomClosedReason, string> = {
  'host-left': 'The host closed the room.',
  'opponent-left': 'Your opponent left the game.',
  'opponent-timed-out': 'Your opponent did not come back in time.',
}
