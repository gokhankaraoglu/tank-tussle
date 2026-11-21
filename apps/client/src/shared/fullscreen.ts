import { useSyncExternalStore } from 'react'
import { isNativeApp } from './platform.js'

/** `lock` is missing from TypeScript's DOM types but exists in Chrome/Android browsers. */
interface LockableOrientation {
  lock?(orientation: 'landscape'): Promise<void>
  unlock?(): void
}

/**
 * True where a page may go full screen. iPhone Safari does not allow it (only video can), and
 * the native app is always full screen already.
 */
export const canGoFullscreen = (): boolean =>
  !isNativeApp() && typeof document !== 'undefined' && document.fullscreenEnabled === true

/** Full screen, and on phones that allow it, held in landscape like a real game. */
export const enterGameFullscreen = async (): Promise<void> => {
  await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
  try {
    await (screen.orientation as LockableOrientation).lock?.('landscape')
  } catch {
    // Desktop browsers refuse orientation locks; full screen alone is fine there.
  }
}

export const exitGameFullscreen = async (): Promise<void> => {
  ;(screen.orientation as LockableOrientation).unlock?.()
  if (document.fullscreenElement) await document.exitFullscreen()
}

export const useIsFullscreen = (): boolean =>
  useSyncExternalStore(
    (notify) => {
      document.addEventListener('fullscreenchange', notify)
      return () => document.removeEventListener('fullscreenchange', notify)
    },
    () => document.fullscreenElement !== null,
  )
