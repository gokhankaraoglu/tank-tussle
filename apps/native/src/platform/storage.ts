import type { KeyValueStorage } from '@tank-tussle/client-core'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = [
  'tank-tussle:seat',
  'tank-tussle:audio',
  'tank-tussle:profile',
  'tank-tussle:ladder',
] as const

/**
 * The shared stores expect synchronous storage; AsyncStorage is not. This keeps a copy in
 * memory: read once at startup, then served from memory and written through in the background.
 */
export const loadDeviceStorage = async (): Promise<KeyValueStorage> => {
  const values = new Map<string, string>()
  try {
    for (const [key, value] of await AsyncStorage.multiGet([...KEYS])) {
      if (value !== null) values.set(key, value)
    }
  } catch {
    // Start empty: preferences and the seat token simply are not remembered.
  }
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
      AsyncStorage.setItem(key, value).catch(() => undefined)
    },
    removeItem: (key) => {
      values.delete(key)
      AsyncStorage.removeItem(key).catch(() => undefined)
    },
  }
}
