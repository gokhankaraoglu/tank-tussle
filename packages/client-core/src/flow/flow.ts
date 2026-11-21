import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import type { RoomView } from '@tank-tussle/protocol'
import type { OnlineConnection } from '../network/online-connection.js'
import type { GameSession } from '../session/game-session.js'
import type { GameMode } from './match-setup.js'

/** The screen the app is on. Each screen carries exactly the data it needs. */
export type Screen =
  | { readonly name: 'menu' }
  | { readonly name: 'ladder' }
  | { readonly name: 'friend' }
  | { readonly name: 'profile' }
  /** Looking for an opponent after one tap on "Play". */
  | { readonly name: 'quick-match'; readonly connection: OnlineConnection }
  | { readonly name: 'setup'; readonly mode: GameMode; readonly joinCode?: string }
  | {
      readonly name: 'online'
      readonly connection: OnlineConnection
      readonly profile: PlayerProfile
      readonly joinCode?: string
    }
  | {
      readonly name: 'create-room'
      readonly connection: OnlineConnection
      readonly profile: PlayerProfile
    }
  | {
      readonly name: 'room'
      readonly connection: OnlineConnection
      readonly room: RoomView
      readonly you: PlayerIndex
      /** A quick-match room starts by itself and falls back to the computer if nobody comes. */
      readonly quick: boolean
    }
  | { readonly name: 'resuming'; readonly connection: OnlineConnection }
  | {
      readonly name: 'match'
      readonly session: GameSession
      /** Set when the match is a rung of the solo ladder. */
      readonly ladderLevel?: number
    }

export type FlowAction =
  | { readonly type: 'choose-mode'; readonly mode: GameMode }
  | { readonly type: 'open'; readonly screen: 'ladder' | 'friend' | 'profile' }
  | { readonly type: 'start-quick-match'; readonly connection: OnlineConnection }
  | {
      readonly type: 'enter-online'
      readonly connection: OnlineConnection
      readonly profile: PlayerProfile
      readonly joinCode?: string
    }
  | { readonly type: 'open-create-room' }
  | {
      readonly type: 'enter-room'
      readonly room: RoomView
      readonly you: PlayerIndex
      readonly quick?: boolean
    }
  | { readonly type: 'back-to-online' }
  | { readonly type: 'start-match'; readonly session: GameSession; readonly ladderLevel?: number }
  | { readonly type: 'back-to-menu' }

export const initialScreen: Screen = { name: 'menu' }

/** The player's own profile as the room knows it. */
export const profileInRoom = (room: RoomView, you: PlayerIndex): PlayerProfile => {
  const seat = you === 0 ? room.host : (room.guest ?? room.host)
  return { name: seat.name, color: seat.color }
}

const onlineContext = (
  screen: Screen,
): { connection: OnlineConnection; profile: PlayerProfile } | null => {
  switch (screen.name) {
    case 'online':
    case 'create-room':
      return { connection: screen.connection, profile: screen.profile }
    case 'room':
      return { connection: screen.connection, profile: profileInRoom(screen.room, screen.you) }
    default:
      return null
  }
}

const connectionOf = (screen: Screen): OnlineConnection | null =>
  screen.name === 'resuming' || screen.name === 'quick-match'
    ? screen.connection
    : (onlineContext(screen)?.connection ?? null)

type ActionOf<T extends FlowAction['type']> = Extract<FlowAction, { type: T }>

const enterRoom = (screen: Screen, action: ActionOf<'enter-room'>): Screen => {
  const connection = connectionOf(screen)
  if (!connection) return screen
  const { room, you, quick = false } = action
  return { name: 'room', connection, room, you, quick }
}

const startMatch = ({ session, ladderLevel }: ActionOf<'start-match'>): Screen =>
  ladderLevel === undefined ? { name: 'match', session } : { name: 'match', session, ladderLevel }

/** Screens that only make sense while online keep the screen as it is otherwise. */
const withOnlineContext = (screen: Screen, name: 'online' | 'create-room'): Screen => {
  const context = onlineContext(screen)
  return context ? { name, ...context } : screen
}

export const flowReducer = (screen: Screen, action: FlowAction): Screen => {
  switch (action.type) {
    case 'choose-mode':
      return { name: 'setup', mode: action.mode }
    case 'open':
      return { name: action.screen }
    case 'start-quick-match':
      return { name: 'quick-match', connection: action.connection }
    case 'enter-online': {
      const { connection, profile, joinCode } = action
      return { name: 'online', connection, profile, joinCode }
    }
    case 'open-create-room':
      return withOnlineContext(screen, 'create-room')
    case 'enter-room':
      return enterRoom(screen, action)
    case 'back-to-online':
      return withOnlineContext(screen, 'online')
    case 'start-match':
      return startMatch(action)
    case 'back-to-menu':
      return screen.name === 'menu' ? screen : initialScreen
  }
}

/** The connection a screen owns, so it can be closed when leaving online play. */
export const ownedConnection = connectionOf
