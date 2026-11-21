/**
 * Synchronous string storage, the shape of the browser's `localStorage`. Platforms without
 * one (React Native) provide an adapter. Implementations may throw; callers guard every use.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const memoryStorage = (): KeyValueStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}
