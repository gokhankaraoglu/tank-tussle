import { useEffect, useSyncExternalStore } from 'react'
import { useDependencies } from '../app/dependencies.js'
import type { AudioService } from '@tank-tussle/client-core'
import type { AudioSettings } from '@tank-tussle/client-core'
import type { MusicTrack } from '@tank-tussle/client-core'

export const useAudio = (): AudioService => useDependencies().audio

export const useAudioSettings = (): AudioSettings => {
  const { settings } = useAudio()
  return useSyncExternalStore(settings.subscribe, settings.get)
}

/**
 * Requests a music track while the calling screen is shown.
 * `undefined` means "no opinion", letting a nested screen choose instead.
 */
export const useMusic = (track: MusicTrack | undefined): void => {
  const audio = useAudio()
  useEffect(() => {
    if (track !== undefined) audio.playMusic(track)
  }, [audio, track])
}

/** One delegated listener gives every enabled button a click sound. */
export const useButtonClickSounds = (): void => {
  const audio = useAudio()
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null
      if (button && !button.disabled) audio.playEffect('click', { volume: 0.4 })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [audio])
}
