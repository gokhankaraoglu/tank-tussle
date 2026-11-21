import { describe, expect, it } from 'vitest'
import { createRng, deriveSeed } from './rng.js'

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(123)
    const b = createRng(123)
    expect(Array.from({ length: 5 }, a.next)).toEqual(Array.from({ length: 5 }, b.next))
  })

  it('keeps int() inside its bounds', () => {
    const rng = createRng(9)
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(2, 4)
      expect(value).toBeGreaterThanOrEqual(2)
      expect(value).toBeLessThanOrEqual(4)
    }
  })

  it('derives different seeds for different salts', () => {
    expect(deriveSeed(1, 0)).not.toBe(deriveSeed(1, 1))
  })
})
