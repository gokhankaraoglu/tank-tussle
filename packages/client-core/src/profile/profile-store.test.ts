import { describe, expect, it, vi } from 'vitest'
import { memoryStorage, type KeyValueStorage } from '../storage/key-value-storage.js'
import { DEFAULT_PROFILE, ProfileStore } from './profile-store.js'

describe('ProfileStore', () => {
  it('starts with the default profile', () => {
    const storage = memoryStorage()
    expect(new ProfileStore(() => storage).get()).toEqual(DEFAULT_PROFILE)
  })

  it('remembers a saved profile and notifies listeners', () => {
    const storage = memoryStorage()
    const store = new ProfileStore(() => storage)
    const listener = vi.fn()
    store.subscribe(listener)
    store.save({ name: '  Ada ', color: '#3ddcff' })

    expect(listener).toHaveBeenCalledOnce()
    expect(new ProfileStore(() => storage).get()).toEqual({ name: 'Ada', color: '#3ddcff' })
  })

  it('never keeps an empty name', () => {
    const storage = memoryStorage()
    const store = new ProfileStore(() => storage)
    store.save({ name: '   ', color: '#3ddcff' })
    expect(store.get().name).toBe(DEFAULT_PROFILE.name)
  })

  it('works when storage is unavailable', () => {
    const blocked = (): KeyValueStorage => {
      throw new Error('blocked')
    }
    const store = new ProfileStore(blocked)
    expect(() => store.save({ name: 'Ada', color: '#3ddcff' })).not.toThrow()
    expect(store.get().name).toBe('Ada')
  })
})
