import type { AudioService, EffectOptions } from '@tank-tussle/client-core'
import type { AudioSettingsStore } from '@tank-tussle/client-core'
import { EFFECTS, MUSIC, type EffectId, type MusicTrack } from '@tank-tussle/client-core'
import { soundUrl } from '../shared/web-storage.js'

const EFFECTS_VOLUME = 0.55
const MUSIC_VOLUME = 0.45
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const

/** The same effect started within this window is skipped, so bursts don't clip. */
const RETRIGGER_MS = 40

/**
 * Effects go through Web Audio (low latency, overlapping playback); music streams through
 * a single <audio> element. Browsers block audio until the first user gesture, so playback
 * requested earlier is resumed then.
 */
export class WebAudioService implements AudioService {
  private context: AudioContext | null = null
  private effectsGain: GainNode | null = null
  private readonly buffers = new Map<EffectId, Promise<AudioBuffer | null>>()
  private readonly lastPlayed = new Map<EffectId, number>()
  private readonly music = new Audio()
  private track: MusicTrack | null = null
  private preloaded = false
  private interrupted = false

  constructor(readonly settings: AudioSettingsStore) {
    this.music.preload = 'auto'
    settings.subscribe(() => this.applySettings())
    // Browsers only let audio start from a real user gesture. On touch screens a tap counts
    // on touchend/pointerup/click, not on pointerdown, so listen to all of them.
    const unlock = () => this.unlock()
    for (const event of UNLOCK_EVENTS) {
      window.addEventListener(event, unlock, { capture: true, passive: true })
    }
    document.addEventListener('visibilitychange', () => this.handleVisibility())
  }

  playEffect(id: EffectId, { volume = 1 }: EffectOptions = {}): void {
    if (this.settings.get().muted || this.interrupted) return
    const now = performance.now()
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < RETRIGGER_MS) return
    this.lastPlayed.set(id, now)

    const context = this.ensureContext()
    if (!context || context.state !== 'running') return
    void this.loadBuffer(context, id).then((buffer) => {
      if (!buffer || !this.effectsGain) return
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      gain.gain.value = volume
      source.connect(gain).connect(this.effectsGain)
      source.start()
    })
  }

  playMusic(track: MusicTrack | null): void {
    if (track === this.track) return
    this.track = track
    this.music.pause()
    if (!track) return

    const { file, loop } = MUSIC[track]
    this.music.src = soundUrl(file)
    this.music.loop = loop
    this.music.currentTime = 0
    this.applySettings()
  }

  setInterrupted(interrupted: boolean): void {
    this.interrupted = interrupted
    this.applySettings()
  }

  /** Decodes every effect up front so the first shot isn't silent. */
  preloadEffects(): void {
    const context = this.ensureContext()
    if (!context) return
    for (const id of Object.keys(EFFECTS) as EffectId[]) void this.loadBuffer(context, id)
  }

  /** Runs on every gesture until audio is actually running, then becomes a no-op. */
  private unlock(): void {
    const context = this.ensureContext()
    if (context?.state === 'running' && this.preloaded) return
    void context?.resume()
    if (!this.preloaded) {
      this.preloaded = true
      this.preloadEffects()
    }
    this.applySettings()
  }

  /** A game left in the background (other tab, phone home screen) must not keep playing. */
  private handleVisibility(): void {
    if (document.hidden) void this.context?.suspend()
    else void this.context?.resume()
    this.applySettings()
  }

  private applySettings(): void {
    const { muted, musicEnabled } = this.settings.get()
    this.music.volume = MUSIC_VOLUME
    this.music.muted = muted || !musicEnabled
    if (this.track && !this.music.muted && !document.hidden && !this.interrupted) {
      // Rejected until the first gesture; `unlock` tries again.
      this.music.play().catch(() => undefined)
    } else {
      this.music.pause()
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context
    if (typeof AudioContext === 'undefined') return null
    this.context = new AudioContext()
    this.effectsGain = this.context.createGain()
    this.effectsGain.gain.value = EFFECTS_VOLUME
    this.effectsGain.connect(this.context.destination)
    return this.context
  }

  private loadBuffer(context: AudioContext, id: EffectId): Promise<AudioBuffer | null> {
    let buffer = this.buffers.get(id)
    if (!buffer) {
      buffer = fetch(soundUrl(EFFECTS[id]))
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data))
        .catch(() => null)
      this.buffers.set(id, buffer)
    }
    return buffer
  }
}
