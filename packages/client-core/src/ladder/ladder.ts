import { CPU_LEVELS, type PlayerProfile } from '@tank-tussle/game-core'
import { DEFAULT_COLORS, distinctColor } from '@tank-tussle/protocol'
import type { MatchSetup } from '../flow/match-setup.js'
import { Listeners } from '../network/listeners.js'
import type { GameSession } from '../session/game-session.js'
import type { KeyValueStorage } from '../storage/key-value-storage.js'

export interface LadderRung {
  /** CPU skill, 1 (weakest) to 8. */
  readonly level: number
  readonly name: string
}

const RUNG_NAMES = [
  'Rookie',
  'Cadet',
  'Gunner',
  'Sergeant',
  'Captain',
  'Major',
  'General',
  'Legend',
]

/** The solo progression: beat one computer opponent to unlock the next, stronger one. */
export const LADDER: readonly LadderRung[] = RUNG_NAMES.map((name, index) => ({
  level: CPU_LEVELS.min + index,
  name,
}))

const KEY = 'tank-tussle:ladder'

/** How far the player has climbed, remembered per device. */
export class LadderStore {
  private beaten: number
  private readonly listeners = new Listeners<number>()

  constructor(private readonly storage: () => KeyValueStorage) {
    this.beaten = this.load()
  }

  /** The highest level beaten so far; 0 before the first win. */
  getBeaten = (): number => this.beaten

  subscribe = (listener: () => void): (() => void) => this.listeners.add(listener)

  isUnlocked(level: number): boolean {
    return level <= this.beaten + 1
  }

  /** The opponent to face next: the first one not beaten yet, or the last rung. */
  nextLevel(): number {
    return Math.min(CPU_LEVELS.max, this.beaten + 1)
  }

  recordWin(level: number): void {
    if (level <= this.beaten || !this.isUnlocked(level)) return
    this.beaten = level
    try {
      this.storage().setItem(KEY, String(level))
    } catch {
      // Progress just won't survive a restart.
    }
    this.listeners.emit(level)
  }

  private load(): number {
    try {
      const value = Number(this.storage().getItem(KEY))
      return Number.isInteger(value) && value >= 0 && value <= CPU_LEVELS.max ? value : 0
    } catch {
      return 0
    }
  }
}

/** The computer opponent for a level, in a colour that differs from the player's. */
export const cpuOpponent = (level: number, playerColor: string): PlayerProfile => ({
  name: LADDER.find((rung) => rung.level === level)?.name ?? `CPU ${level}`,
  color: distinctColor(DEFAULT_COLORS[1], playerColor),
})

export const cpuMatchSetup = (profile: PlayerProfile, level: number): MatchSetup => ({
  mode: 'cpu',
  players: [profile, cpuOpponent(level, profile.color)],
  cpuLevel: level,
})

/** Records the win when the player (seat 0) beats this rung. Returns a function to stop watching. */
export const trackLadderMatch = (
  session: GameSession,
  level: number,
  ladder: LadderStore,
): (() => void) => {
  const check = () => {
    const { state, pendingShot } = session.getSnapshot()
    if (state.phase === 'over' && !pendingShot && state.result === 0) ladder.recordWin(level)
  }
  check()
  return session.subscribe(check)
}
