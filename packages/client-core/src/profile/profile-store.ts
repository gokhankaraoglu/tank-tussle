import type { PlayerProfile } from '@tank-tussle/game-core'
import { DEFAULT_COLORS, PROFILE_LIMITS } from '@tank-tussle/protocol'
import { Listeners } from '../network/listeners.js'
import type { KeyValueStorage } from '../storage/key-value-storage.js'

const KEY = 'tank-tussle:profile'
export const DEFAULT_PROFILE: PlayerProfile = { name: 'Player', color: DEFAULT_COLORS[0] }

/**
 * The player's own name and colour, remembered per device so one tap is enough to start a
 * match. Works without storage too.
 */
export class ProfileStore {
  private profile: PlayerProfile
  private readonly listeners = new Listeners<PlayerProfile>()

  /** `storage` is a getter because merely touching a blocked storage can throw. */
  constructor(private readonly storage: () => KeyValueStorage) {
    this.profile = this.load()
  }

  get = (): PlayerProfile => this.profile

  subscribe = (listener: () => void): (() => void) => this.listeners.add(listener)

  save(profile: PlayerProfile): void {
    const name = profile.name.trim().slice(0, PROFILE_LIMITS.nameMaxLength)
    this.profile = { name: name || DEFAULT_PROFILE.name, color: profile.color }
    try {
      this.storage().setItem(KEY, JSON.stringify(this.profile))
    } catch {
      // The profile just won't survive a restart.
    }
    this.listeners.emit(this.profile)
  }

  private load(): PlayerProfile {
    try {
      const raw = this.storage().getItem(KEY)
      return raw
        ? { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<PlayerProfile>) }
        : DEFAULT_PROFILE
    } catch {
      return DEFAULT_PROFILE
    }
  }
}
