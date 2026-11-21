import { describe, expect, it } from 'vitest'
import { DEFAULT_LIMITS, loadAppConfig } from './app-config.js'

describe('loadAppConfig', () => {
  it('uses safe defaults', () => {
    const config = loadAppConfig({})
    expect(config.logLevel).toBe('info')
    expect(config.trustProxy).toBe(false)
    expect(config.limits).toEqual(DEFAULT_LIMITS)
  })

  it('reads the log level, proxy setting and limits', () => {
    const config = loadAppConfig({
      LOG_LEVEL: 'DEBUG',
      TRUST_PROXY: 'true',
      MAX_CONNECTIONS_PER_IP: '5',
      MAX_ROOMS: '10',
    })
    expect(config.logLevel).toBe('debug')
    expect(config.trustProxy).toBe(true)
    expect(config.limits.maxConnectionsPerAddress).toBe(5)
    expect(config.limits.maxRooms).toBe(10)
  })

  it('rejects nonsense instead of running unprotected', () => {
    expect(() => loadAppConfig({ LOG_LEVEL: 'chatty' })).toThrow('LOG_LEVEL')
    expect(() => loadAppConfig({ MAX_ROOMS: '0' })).toThrow('MAX_ROOMS')
    expect(() => loadAppConfig({ MAX_CONNECTIONS: 'lots' })).toThrow('MAX_CONNECTIONS')
  })
})
