import { soundForEvent, type AudioSettings, type MusicTrack } from '@tank-tussle/client-core'
import type { ShotEvent, WeaponId } from '@tank-tussle/game-core'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useDependencies } from './dependencies'

export const useAudioSettings = (): AudioSettings => {
  const { settings } = useDependencies().audio
  return useSyncExternalStore(settings.subscribe, settings.get)
}

/** Requests a music track while the calling screen is shown; `undefined` = no opinion. */
export const useMusic = (track: MusicTrack | undefined): void => {
  const { audio } = useDependencies()
  useEffect(() => {
    if (track !== undefined) audio.playMusic(track)
  }, [audio, track])
}

export const useClickSound = (): (() => void) => {
  const { audio } = useDependencies()
  return useCallback(() => audio.playEffect('click', { volume: 0.4 }), [audio])
}

export const useShotSounds = (): ((events: ShotEvent[], weaponId: WeaponId) => void) => {
  const { audio } = useDependencies()
  return useCallback(
    (events, weaponId) => {
      for (const event of events) {
        const cue = soundForEvent(event, weaponId)
        if (cue) audio.playEffect(cue.id, cue.options)
      }
    },
    [audio],
  )
}

const FIRST_DELAY_MS = 380
const FASTEST_DELAY_MS = 40

/** Step multiplier for the n-th repeat while a button is held: start fine, then speed up. */
export const holdAcceleration = (repeat: number): number => {
  if (repeat < 12) return 1
  return repeat < 30 ? 3 : 6
}

/** Press-and-hold behaviour for stepper buttons: `action(repeat)` fires faster the longer it is held. */
export const useHoldRepeat = (action: (repeat: number) => void, enabled: boolean) => {
  const latest = useRef(action)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    latest.current = action
  })

  const stop = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => {
    if (!enabled) stop()
  }, [enabled, stop])
  useEffect(() => stop, [stop])

  return {
    onPressIn: () => {
      if (!enabled) return
      stop()
      latest.current(0)
      let repeat = 1
      let delay = FIRST_DELAY_MS
      const tick = () => {
        latest.current(repeat++)
        delay = Math.max(FASTEST_DELAY_MS, delay * 0.75)
        timer.current = setTimeout(tick, delay)
      }
      timer.current = setTimeout(tick, delay)
    },
    onPressOut: stop,
  }
}
