import { describe, expect, it } from 'vitest'
import { buildArsenal } from './arsenal.js'

describe('buildArsenal', () => {
  it('counts remaining and used copies and points at the next slot', () => {
    const arsenal = buildArsenal(['thumper', 'skipstone', 'thumper'], ['thumper', 'mudslide'])
    expect(arsenal).toEqual([
      { id: 'thumper', remaining: 2, used: 1, nextSlot: 0 },
      { id: 'mudslide', remaining: 0, used: 1, nextSlot: null },
      { id: 'skipstone', remaining: 1, used: 0, nextSlot: 1 },
    ])
  })

  it('is empty before the draft', () => {
    expect(buildArsenal([], [])).toEqual([])
  })
})
