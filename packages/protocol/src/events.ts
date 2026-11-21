import type {
  FireCommand,
  MatchState,
  MoveDirection,
  PlayerIndex,
  PlayerProfile,
  ShotInput,
} from '@tank-tussle/game-core'
import type {
  ResumePayload,
  RoomClosedReason,
  RoomJoinedPayload,
  RoomSettings,
  RoomSummary,
  RoomView,
} from './rooms.js'
import type { ChatMessage, ChatReportPayload, ChatSendPayload } from './chat.js'

/**
 * Bumped whenever events or payload shapes change. Clients send it in the handshake and the
 * server refuses mismatches, so an outdated server can't feed a client state it can't draw.
 */
export const PROTOCOL_VERSION = 8

/** Connection error message used when the versions differ. */
export const PROTOCOL_MISMATCH = 'PROTOCOL_MISMATCH'

/** Uniform reply for request/response style events. */
export type Ack<T = void> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: string }

export interface CreateRoomPayload {
  readonly profile: PlayerProfile
  readonly settings: RoomSettings
}

export interface JoinRoomPayload {
  readonly roomId: string
  readonly profile: PlayerProfile
}

export interface ResumeRequest {
  readonly token: string
}

export interface PickWeaponPayload {
  readonly poolIndex: number
}

export interface AimPayload {
  readonly angle: number
  readonly power: number
}

export interface MovePayload {
  readonly direction: MoveDirection
}

export type FirePayload = FireCommand

export interface MatchStartedPayload {
  readonly state: MatchState
  /** Which tank the receiving client controls. */
  readonly you: PlayerIndex
}

export interface ShotPayload {
  readonly player: PlayerIndex
  readonly input: ShotInput
  /** Authoritative state after the shot; clients replay the shot locally, then adopt this. */
  readonly state: MatchState
}

/** Event names, usable in decorators and `socket.emit` alike. */
export const ClientEvent = {
  ListRooms: 'lobby:list',
  CreateRoom: 'lobby:create',
  JoinRoom: 'lobby:join',
  LeaveRoom: 'lobby:leave',
  StartMatch: 'room:start',
  Resume: 'session:resume',
  PickWeapon: 'match:pick',
  DealAll: 'match:deal-all',
  Aim: 'match:aim',
  Move: 'match:move',
  Fire: 'match:fire',
  Rematch: 'match:rematch',
  ChatSend: 'chat:send',
  ChatReport: 'chat:report',
} as const

export const ServerEvent = {
  Rooms: 'lobby:rooms',
  RoomUpdated: 'room:updated',
  RoomClosed: 'room:closed',
  MatchStarted: 'match:started',
  MatchState: 'match:state',
  Aimed: 'match:aimed',
  Shot: 'match:shot',
  RematchRequested: 'match:rematch-requested',
  ChatMessage: 'chat:message',
} as const

export interface ClientToServerEvents {
  [ClientEvent.ListRooms]: (ack: (rooms: RoomSummary[]) => void) => void
  [ClientEvent.CreateRoom]: (
    payload: CreateRoomPayload,
    ack: (reply: Ack<RoomJoinedPayload>) => void,
  ) => void
  [ClientEvent.JoinRoom]: (
    payload: JoinRoomPayload,
    ack: (reply: Ack<RoomJoinedPayload>) => void,
  ) => void
  [ClientEvent.LeaveRoom]: () => void
  [ClientEvent.StartMatch]: (ack: (reply: Ack) => void) => void
  [ClientEvent.Resume]: (payload: ResumeRequest, ack: (reply: Ack<ResumePayload>) => void) => void
  [ClientEvent.PickWeapon]: (payload: PickWeaponPayload, ack: (reply: Ack) => void) => void
  /** On your pick: deals every remaining weapon at random to both players and starts the battle. */
  [ClientEvent.DealAll]: (ack: (reply: Ack) => void) => void
  [ClientEvent.Aim]: (payload: AimPayload) => void
  [ClientEvent.Move]: (payload: MovePayload, ack: (reply: Ack) => void) => void
  [ClientEvent.Fire]: (payload: FirePayload, ack: (reply: Ack) => void) => void
  [ClientEvent.Rematch]: () => void
  /** A chat line for everyone in your room (waiting room or match). */
  [ClientEvent.ChatSend]: (payload: ChatSendPayload, ack: (reply: Ack) => void) => void
  /** Flags the opponent's message for review; it is written to the server log. */
  [ClientEvent.ChatReport]: (payload: ChatReportPayload, ack: (reply: Ack) => void) => void
}

export interface ServerToClientEvents {
  [ServerEvent.Rooms]: (rooms: RoomSummary[]) => void
  [ServerEvent.RoomUpdated]: (payload: { room: RoomView }) => void
  [ServerEvent.RoomClosed]: (payload: { reason: RoomClosedReason }) => void
  [ServerEvent.MatchStarted]: (payload: MatchStartedPayload) => void
  [ServerEvent.MatchState]: (payload: { state: MatchState }) => void
  [ServerEvent.Aimed]: (payload: AimPayload & { player: PlayerIndex }) => void
  [ServerEvent.Shot]: (payload: ShotPayload) => void
  [ServerEvent.RematchRequested]: (payload: { player: PlayerIndex }) => void
  [ServerEvent.ChatMessage]: (message: ChatMessage) => void
}
