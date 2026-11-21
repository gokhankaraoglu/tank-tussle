import type {
  AudioService,
  AudioSettingsStore,
  EffectId,
  EffectOptions,
  MusicTrack,
} from '@tank-tussle/client-core'
import { MUSIC } from '@tank-tussle/client-core'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { AppState, type AppStateStatus } from 'react-native'
import { EFFECT_ASSETS, MUSIC_ASSETS } from './sound-assets'

const EFFECTS_VOLUME = 0.55
const MUSIC_VOLUME = 0.45
/** Players per effect, so quick repeats (bursts, clusters) can overlap. */
const VOICES = 3
/** The same effect started within this window is skipped, so bursts don't clip. */
const RETRIGGER_MS = 40

/**
 * Only a backgrounded app goes quiet. At launch iOS can still report `unknown`; treating that as
 * "in the background" kept the game silent until the app state happened to change.
 */
const isForeground = (state: AppStateStatus): boolean =>
  state !== 'background' && state !== 'inactive'

/** Sound on iOS and Android through expo-audio: pooled players for effects, one for music. */
export class ExpoAudioService implements AudioService {
  private readonly voices = new Map<EffectId, { players: AudioPlayer[]; next: number }>()
  private readonly lastPlayed = new Map<EffectId, number>()
  private music: AudioPlayer | null = null
  private track: MusicTrack | null = null
  private active = isForeground(AppState.currentState)
  private interrupted = false

  constructor(readonly settings: AudioSettingsStore) {
    // A game should not override the phone's silent switch.
    setAudioModeAsync({ playsInSilentMode: false }).catch(() => undefined)
    settings.subscribe(() => this.applySettings())
    AppState.addEventListener('change', (state) => {
      this.active = isForeground(state)
      this.applySettings()
    })
  }

  playEffect(id: EffectId, { volume = 1 }: EffectOptions = {}): void {
    if (this.settings.get().muted || !this.active || this.interrupted) return
    const now = Date.now()
    if (now - (this.lastPlayed.get(id) ?? 0) < RETRIGGER_MS) return
    this.lastPlayed.set(id, now)

    const voice = this.voiceFor(id)
    const player = voice.players[voice.next]
    voice.next = (voice.next + 1) % voice.players.length
    if (!player) return
    try {
      player.volume = EFFECTS_VOLUME * volume
      void player.seekTo(0).catch(() => undefined)
      player.play()
    } catch {
      // A failed sound must never interrupt the game.
    }
  }

  playMusic(track: MusicTrack | null): void {
    if (track === this.track) return
    this.track = track
    this.stopMusic()
    if (!track) return
    try {
      this.music = createAudioPlayer(MUSIC_ASSETS[track])
      this.music.loop = MUSIC[track].loop
      this.music.volume = MUSIC_VOLUME
    } catch {
      this.music = null
    }
    this.applySettings()
  }

  setInterrupted(interrupted: boolean): void {
    this.interrupted = interrupted
    this.applySettings()
  }

  /**
   * `remove()` alone does not stop playback on Android: the old track kept playing under the
   * new one. Pause first, then release.
   */
  private stopMusic(): void {
    const old = this.music
    this.music = null
    if (!old) return
    try {
      old.pause()
      old.remove()
    } catch {
      // Already released.
    }
  }

  private voiceFor(id: EffectId): { players: AudioPlayer[]; next: number } {
    let voice = this.voices.get(id)
    if (!voice) {
      const players: AudioPlayer[] = []
      try {
        for (let index = 0; index < VOICES; index++)
          players.push(createAudioPlayer(EFFECT_ASSETS[id]))
      } catch {
        // No players: the effect stays silent.
      }
      voice = { players, next: 0 }
      this.voices.set(id, voice)
    }
    return voice
  }

  /** Music follows the mute and music switches and stops while the app is in the background. */
  private applySettings(): void {
    if (!this.music) return
    const { muted, musicEnabled } = this.settings.get()
    try {
      if (!muted && musicEnabled && this.active && !this.interrupted) this.music.play()
      else this.music.pause()
    } catch {
      // Ignore: the player may already have been released.
    }
  }
}
