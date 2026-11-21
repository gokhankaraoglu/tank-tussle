import { describe, expect, it } from 'vitest'
import { clientAddress } from './client-address.js'

const handshake = (forwarded?: string) => ({
  address: '10.0.0.1',
  headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
})

describe('clientAddress', () => {
  it('uses the forwarded client address behind a trusted proxy', () => {
    expect(clientAddress(handshake('203.0.113.7, 10.1.1.1'), true)).toBe('203.0.113.7')
  })

  it('ignores the header when there is no trusted proxy, so it cannot be spoofed', () => {
    expect(clientAddress(handshake('203.0.113.7'), false)).toBe('10.0.0.1')
  })

  it('falls back to the socket address when the header is missing', () => {
    expect(clientAddress(handshake(), true)).toBe('10.0.0.1')
  })
})
