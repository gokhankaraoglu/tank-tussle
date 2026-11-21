import { useSyncExternalStore } from 'react'

/**
 * Phones: held sideways (wide but short) or upright (narrow). The battle switches to its
 * touch layout, which arranges itself for either orientation.
 */
export const PHONE_SCREEN =
  '(orientation: landscape) and (max-height: 520px), (orientation: portrait) and (max-width: 600px)'

/** Fingers, not a mouse: no hover, coarse pointer. Keyboard hints are hidden there. */
export const TOUCH_DEVICE = '(hover: none) and (pointer: coarse)'

/** True while the CSS media query matches; re-renders when that changes. */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', notify)
      return () => media.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
  )
