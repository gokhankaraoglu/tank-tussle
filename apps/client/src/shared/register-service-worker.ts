import { isNativeApp } from './platform.js'

/**
 * Makes the website installable and playable offline. Skipped inside the native apps, which
 * already ship every file, and in development, where the plugin provides a no-op.
 */
export const registerServiceWorker = (): void => {
  if (isNativeApp() || !('serviceWorker' in navigator)) return
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
