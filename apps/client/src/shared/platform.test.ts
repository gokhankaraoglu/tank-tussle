import { afterEach, describe, expect, it, vi } from 'vitest'
import { inviteLink } from '../app/boot.js'
import { persistentCredentialsStore } from './web-storage.js'
import { isNativeApp, publicWebUrl } from './platform.js'

const pretendNativeApp = () => vi.stubGlobal('Capacitor', { isNativePlatform: () => true })

describe('platform', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('detects the native shell by the global Capacitor injects', () => {
    expect(isNativeApp()).toBe(false)
    pretendNativeApp()
    expect(isNativeApp()).toBe(true)
  })

  it('uses the configured public address for invite links', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://tanks.example.app')
    expect(publicWebUrl()).toBe('https://tanks.example.app')
    expect(inviteLink('abc234')).toBe('https://tanks.example.app/?room=ABC234')
  })

  it('offers no invite link in a native app built without a public address', () => {
    vi.stubEnv('VITE_PUBLIC_URL', '')
    pretendNativeApp()
    expect(publicWebUrl()).toBeNull()
    expect(inviteLink('abc234')).toBeNull()
  })

  it('falls back to the page address on the web', () => {
    vi.stubEnv('VITE_PUBLIC_URL', '')
    vi.stubGlobal('window', { location: { origin: 'https://play.example', pathname: '/' } })
    expect(inviteLink('abc234')).toBe('https://play.example/?room=ABC234')
  })
})

describe('persistentCredentialsStore', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the seat token across app restarts', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    persistentCredentialsStore.save({ roomId: 'abc234', token: 'secret' })
    expect(persistentCredentialsStore.load()).toEqual({ roomId: 'abc234', token: 'secret' })
    persistentCredentialsStore.clear()
    expect(persistentCredentialsStore.load()).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(persistentCredentialsStore.load()).toBeNull()
    expect(() => persistentCredentialsStore.save({ roomId: 'a', token: 'b' })).not.toThrow()
  })
})
