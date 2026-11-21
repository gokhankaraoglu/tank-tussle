interface CapacitorGlobal {
  isNativePlatform?: () => boolean
}

/**
 * True inside the iOS/Android app. The native shell (Capacitor) injects `window.Capacitor`,
 * so the web client needs no native dependency to detect it.
 */
export const isNativeApp = (): boolean => {
  const capacitor = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor
  return capacitor?.isNativePlatform?.() === true
}

/** App-like behaviour that would be wrong on the open web: no pinch zoom, no text selection. */
export const applyNativeAppTweaks = (): void => {
  if (!isNativeApp()) return
  document.documentElement.classList.add('native-app')
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    )
}

/** Public web address of the game, used for invite links. Null if this build has none. */
export const publicWebUrl = (): string | null => {
  const configured = import.meta.env.VITE_PUBLIC_URL
  if (configured) return configured
  return isNativeApp() ? null : `${window.location.origin}${window.location.pathname}`
}
