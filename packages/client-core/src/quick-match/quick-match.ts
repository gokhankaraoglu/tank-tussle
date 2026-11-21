import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import type { RoomSettings, RoomView } from '@tank-tussle/protocol'
import type { OnlineConnection } from '../network/online-connection.js'

/** One-tap play: join someone who is waiting, or wait briefly for someone to join us. */
export const QUICK_MATCH = {
  /** How long to try reaching the server before giving up. */
  connectTimeoutMs: 6000,
  /** How long a quick-match host waits for an opponent before playing the computer instead. */
  waitForOpponentMs: 12000,
  /** Pause between an opponent sitting down and the match starting. */
  startDelayMs: 1500,
  settings: { visibility: 'public', weaponsPerPlayer: 5 } satisfies RoomSettings,
} as const

export type QuickMatchResult =
  | { readonly kind: 'room'; readonly room: RoomView; readonly you: PlayerIndex }
  /** No server, no seat: the caller should start a match against the computer. */
  | { readonly kind: 'unavailable' }

type QuickMatchConnection = Pick<
  OnlineConnection,
  'getStatus' | 'onStatus' | 'listRooms' | 'joinRoom' | 'createRoom'
>

const UNAVAILABLE: QuickMatchResult = { kind: 'unavailable' }

const whenConnected = (connection: QuickMatchConnection): Promise<boolean> =>
  new Promise((resolve) => {
    const settle = (): boolean => {
      const status = connection.getStatus()
      if (status === 'connected') resolve(true)
      else if (status === 'offline' || status === 'outdated') resolve(false)
      else return false
      stop()
      return true
    }
    const stop = connection.onStatus(() => settle())
    settle()
  })

const seatIn = async (
  connection: QuickMatchConnection,
  profile: PlayerProfile,
): Promise<QuickMatchResult> => {
  if (!(await whenConnected(connection))) return UNAVAILABLE
  for (const open of await connection.listRooms()) {
    const joined = await connection.joinRoom(open.id, profile)
    if (joined.ok) return { kind: 'room', room: joined.data.room, you: joined.data.you }
  }
  const created = await connection.createRoom(profile, QUICK_MATCH.settings)
  return created.ok ? { kind: 'room', room: created.data.room, you: created.data.you } : UNAVAILABLE
}

/**
 * Finds a seat in a public game: the first open room that accepts us, otherwise a new room of
 * our own. Resolves with `unavailable` when the server cannot be reached in time.
 */
export const findQuickMatch = (
  connection: QuickMatchConnection,
  profile: PlayerProfile,
  timeoutMs: number = QUICK_MATCH.connectTimeoutMs,
): Promise<QuickMatchResult> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(UNAVAILABLE), timeoutMs)
    seatIn(connection, profile)
      .catch(() => UNAVAILABLE)
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
  })
