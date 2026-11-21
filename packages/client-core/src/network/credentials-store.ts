import type { SeatCredentials } from '@tank-tussle/protocol'
import type { KeyValueStorage } from '../storage/key-value-storage.js'

/** Where the seat token lives between launches. */
export interface CredentialsStore {
  load(): SeatCredentials | null
  save(credentials: SeatCredentials): void
  clear(): void
}

const KEY = 'tank-tussle:seat'

/**
 * Keeps the token in a key-value storage. Storage can be unavailable (private mode, blocked
 * cookies), so every access is guarded.
 */
export const storageCredentialsStore = (storage: () => KeyValueStorage): CredentialsStore => ({
  load() {
    try {
      const raw = storage().getItem(KEY)
      return raw ? (JSON.parse(raw) as SeatCredentials) : null
    } catch {
      return null
    }
  },
  save(credentials) {
    try {
      storage().setItem(KEY, JSON.stringify(credentials))
    } catch {
      // Without storage the player simply cannot resume after a reload.
    }
  },
  clear() {
    try {
      storage().removeItem(KEY)
    } catch {
      // Nothing to clear.
    }
  },
})

export const memoryCredentialsStore = (): CredentialsStore => {
  let value: SeatCredentials | null = null
  return {
    load: () => value,
    save: (credentials) => (value = credentials),
    clear: () => (value = null),
  }
}
