import { distinctColor } from './colors.js'
import { describe, expect, it } from 'vitest'
import {
  InvalidPayloadError,
  parseCreateRoom,
  parseResume,
  parseFire,
  parseJoinRoom,
  parseMove,
  parsePlayerProfile,
} from './validation.js'

describe('payload validation', () => {
  it('accepts and trims a valid profile', () => {
    expect(parsePlayerProfile({ name: '  Ada ', color: '#a0b1c2' })).toEqual({
      name: 'Ada',
      color: '#a0b1c2',
    })
  })

  it.each([
    [null],
    [{ name: '', color: '#ffffff' }],
    [{ name: 'x'.repeat(17), color: '#ffffff' }],
    [{ name: 'Ada', color: 'red' }],
  ])('rejects invalid profile %j', (input) => {
    expect(() => parsePlayerProfile(input)).toThrow(InvalidPayloadError)
  })

  it('requires a well-formed room code when joining and normalises it', () => {
    const profile = { name: 'Ada', color: '#ffffff' }
    expect(() => parseJoinRoom({ profile })).toThrow(InvalidPayloadError)
    expect(() => parseJoinRoom({ roomId: 'abc', profile })).toThrow(InvalidPayloadError)
    expect(parseJoinRoom({ roomId: ' AB12CD ', profile }).roomId).toBe('ab12cd')
  })

  it('only accepts known room settings', () => {
    const profile = { name: 'Ada', color: '#ffffff' }
    expect(
      parseCreateRoom({ profile, settings: { visibility: 'private', weaponsPerPlayer: 5 } })
        .settings,
    ).toEqual({ visibility: 'private', weaponsPerPlayer: 5 })
    expect(() =>
      parseCreateRoom({ profile, settings: { visibility: 'secret', weaponsPerPlayer: 5 } }),
    ).toThrow(InvalidPayloadError)
    expect(() =>
      parseCreateRoom({ profile, settings: { visibility: 'public', weaponsPerPlayer: 7 } }),
    ).toThrow(InvalidPayloadError)
  })

  it('requires a resume token', () => {
    expect(() => parseResume({})).toThrow(InvalidPayloadError)
    expect(parseResume({ token: 'abc' })).toEqual({ token: 'abc' })
  })

  it('only accepts unit move directions', () => {
    expect(parseMove({ direction: -1 })).toEqual({ direction: -1 })
    expect(() => parseMove({ direction: 5 })).toThrow(InvalidPayloadError)
  })

  it('rejects non-finite numbers and fractional slots', () => {
    expect(() => parseFire({ angle: Number.NaN, power: 10, slot: 0 })).toThrow(InvalidPayloadError)
    expect(() => parseFire({ angle: 10, power: 10, slot: 1.5 })).toThrow(InvalidPayloadError)
    expect(parseFire({ angle: 10, power: 10, slot: 2, extra: true })).toEqual({
      angle: 10,
      power: 10,
      slot: 2,
    })
  })
})

describe('distinctColor', () => {
  it('keeps a colour nobody else uses', () => {
    expect(distinctColor('#3ddcff', '#ff7849')).toBe('#3ddcff')
  })

  it('swaps a clashing colour for a free one', () => {
    expect(distinctColor('#FF7849', '#ff7849')).toBe('#3ddcff')
  })
})
