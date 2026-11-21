import { Listeners } from '../network/listeners.js'
import type { KeyValueStorage } from '../storage/key-value-storage.js'

export interface AudioSettings {
  readonly muted: boolean
  readonly musicEnabled: boolean
}

const KEY = 'tank-tussle:audio'
const DEFAULTS: AudioSettings = { muted: false, musicEnabled: true }

/** Player's sound preferences, remembered per device. Works without storage too. */
export class AudioSettingsStore {
  private settings: AudioSettings
  private readonly listeners = new Listeners<AudioSettings>()

  /** `storage` is a getter because merely touching a blocked storage can throw. */
  constructor(private readonly storage: () => KeyValueStorage) {
    this.settings = this.load()
  }

  get = (): AudioSettings => this.settings

  subscribe = (listener: () => void): (() => void) => this.listeners.add(listener)

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch }
    this.save()
    this.listeners.emit(this.settings)
  }

  private load(): AudioSettings {
    try {
      const raw = this.storage().getItem(KEY)
      return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AudioSettings>) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  }

  private save(): void {
    try {
      this.storage().setItem(KEY, JSON.stringify(this.settings))
    } catch {
      // Preferences just won't survive a reload.
    }
  }
}
