import type { PlayerProfile } from '@tank-tussle/game-core'

export type GameMode = 'cpu' | 'hot-seat' | 'online' | 'practice'

export interface MatchSetup {
  readonly mode: GameMode
  readonly players: readonly [PlayerProfile, PlayerProfile]
  /** Only used in CPU mode, 1–8. */
  readonly cpuLevel: number
}
