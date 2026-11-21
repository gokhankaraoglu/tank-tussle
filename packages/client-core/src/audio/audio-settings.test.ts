import { describe, expect, it, vi } from 'vitest'
import { memoryStorage, type KeyValueStorage } from '../storage/key-value-storage.js'
import { AudioSettingsStore } from './audio-settings.js'

describe('AudioSettingsStore', () => {
  it('starts with sound and music on', () => {
    const storage = memoryStorage()
    expect(new AudioSettingsStore(() => storage).get()).toEqual({
      muted: false,
      musicEnabled: true,
    })
  })

  it('remembers changes and notifies listeners', () => {
    const storage = memoryStorage()
    const store = new AudioSettingsStore(() => storage)
    const listener = vi.fn()
    store.subscribe(listener)
    store.update({ muted: true })

    expect(listener).toHaveBeenCalledOnce()
    expect(new AudioSettingsStore(() => storage).get().muted).toBe(true)
  })

  it('works when storage is unavailable', () => {
    const blocked = (): KeyValueStorage => {
      throw new Error('blocked')
    }
    const store = new AudioSettingsStore(blocked)
    expect(() => store.update({ musicEnabled: false })).not.toThrow()
    expect(store.get().musicEnabled).toBe(false)
  })
})
