import type { AudioSettingsStore } from './audio-settings.js'
import type { EffectId, MusicTrack } from './sound-catalog.js'

export interface EffectOptions {
  /** 0–1, multiplied with the master effects volume. */
  readonly volume?: number
}

/** Everything the game needs from audio. UI code depends on this, never on Web Audio. */
export interface AudioService {
  readonly settings: AudioSettingsStore
  playEffect(id: EffectId, options?: EffectOptions): void
  /** Switches the music track; `null` stops music. Calling with the current track is a no-op. */
  playMusic(track: MusicTrack | null): void
  /**
   * Silences everything while something else owns the screen and the speakers (a full-screen
   * ad), then carries on with the same music track.
   */
  setInterrupted(interrupted: boolean): void
}

/** For tests and environments without audio. */
export const createSilentAudio = (settings: AudioSettingsStore): AudioService => ({
  settings,
  playEffect: () => undefined,
  playMusic: () => undefined,
  setInterrupted: () => undefined,
})
