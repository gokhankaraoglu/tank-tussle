import type { ChatChannel } from '../network/chat-channel.js'
import type {
  MatchState,
  MoveDirection,
  PlayerIndex,
  ShotInput,
  ShotResult,
} from '@tank-tussle/game-core'

/** A shot waiting to be animated. `finalState` is applied once playback finishes. */
export interface PendingShot {
  readonly id: number
  readonly player: PlayerIndex
  readonly input: ShotInput
  readonly result: ShotResult
  readonly finalState: MatchState
}

export type SessionStatus = 'active' | 'closed'

/** Network health of an online match. Local matches have none. */
export interface OnlinePresence {
  readonly self: 'connected' | 'reconnecting'
  readonly opponentConnected: boolean
  /** Epoch ms when the disconnected opponent forfeits, if they are away. */
  readonly opponentDeadline: number | null
}

export interface SessionSnapshot {
  /** State shown on screen; stays at the pre-shot state while a shot is animating. */
  readonly state: MatchState
  readonly pendingShot: PendingShot | null
  /** Players this device is allowed to control. */
  readonly controllable: readonly PlayerIndex[]
  readonly status: SessionStatus
  /** Why the match ended early (opponent left, timed out…). */
  readonly closedMessage: string | null
  readonly presence: OnlinePresence | null
  readonly rematchRequestedBy: readonly PlayerIndex[]
  readonly error: string | null
}

/**
 * What the UI needs from a match, regardless of where the rules run.
 * Local play and online play are interchangeable implementations.
 */
export interface GameSession {
  /** Chat with the opponent; null when there is nobody to talk to (local play). */
  readonly chat: ChatChannel | null
  getSnapshot(): SessionSnapshot
  subscribe(listener: () => void): () => void
  pick(poolIndex: number): void
  /** Deals every remaining weapon at random to both players; the battle starts right away. */
  dealAll(): void
  aim(angle: number, power: number): void
  move(direction: MoveDirection): void
  fire(slot: number): void
  /** Called by the UI when the pending shot animation has finished. */
  completeShot(): void
  rematch(): void
  dispose(): void
}

/** The player whose input this device should collect right now, if any. */
export const activeLocalPlayer = (snapshot: SessionSnapshot): PlayerIndex | null => {
  const { state, controllable, pendingShot } = snapshot
  if (pendingShot) return null
  const player = state.phase === 'shop' ? state.shop.picker : state.turn
  if (state.phase === 'over') return null
  return controllable.includes(player) ? player : null
}
