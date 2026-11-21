import type { ShotEvent, WeaponId } from '@tank-tussle/game-core'
import { useCallback } from 'react'
import { soundForEvent } from '@tank-tussle/client-core'
import { useAudio } from './use-audio.js'

/** Returns a callback that plays the sounds for a batch of shot events. */
export const useShotSounds = (): ((events: ShotEvent[], weaponId: WeaponId) => void) => {
  const audio = useAudio()
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
