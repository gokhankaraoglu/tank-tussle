import {
  DEFAULT_SERVER_URL,
  storageCredentialsStore,
  type KeyValueStorage,
} from '@tank-tussle/client-core'

/** Per-tab: survives reloads, and two browser tabs can play each other while testing. */
export const sessionCredentialsStore = storageCredentialsStore(() => sessionStorage)

/** Survives the app being closed — used in the native app shell, where there is only one "tab". */
export const persistentCredentialsStore = storageCredentialsStore(() => localStorage)

export const browserStorage = (): KeyValueStorage => localStorage

export const serverUrl = (): string => import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL

export const soundUrl = (file: string): string => `${import.meta.env.BASE_URL}sounds/${file}`
