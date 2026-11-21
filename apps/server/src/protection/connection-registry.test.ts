import { describe, expect, it } from 'vitest'
import { ConnectionRegistry } from './connection-registry.js'

describe('ConnectionRegistry', () => {
  it('limits connections per address', () => {
    const registry = new ConnectionRegistry({ maxConnections: 10, maxConnectionsPerAddress: 2 })
    expect(registry.admit('a')).toBe('admitted')
    expect(registry.admit('a')).toBe('admitted')
    expect(registry.admit('a')).toBe('too-many-from-address')
    expect(registry.admit('b')).toBe('admitted')
  })

  it('limits connections in total', () => {
    const registry = new ConnectionRegistry({ maxConnections: 2, maxConnectionsPerAddress: 5 })
    registry.admit('a')
    registry.admit('b')
    expect(registry.admit('c')).toBe('server-full')
  })

  it('frees a slot when a connection closes', () => {
    const registry = new ConnectionRegistry({ maxConnections: 1, maxConnectionsPerAddress: 1 })
    registry.admit('a')
    registry.release('a')
    expect(registry.openConnections).toBe(0)
    expect(registry.admit('a')).toBe('admitted')
  })

  it('ignores releases for unknown addresses', () => {
    const registry = new ConnectionRegistry({ maxConnections: 1, maxConnectionsPerAddress: 1 })
    registry.release('ghost')
    expect(registry.openConnections).toBe(0)
  })
})
