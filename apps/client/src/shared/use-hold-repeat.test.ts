import { describe, expect, it } from 'vitest'
import { holdAcceleration } from './use-hold-repeat.js'

describe('holdAcceleration', () => {
  it('starts fine and speeds up the longer a button is held', () => {
    expect(holdAcceleration(0)).toBe(1)
    expect(holdAcceleration(11)).toBe(1)
    expect(holdAcceleration(20)).toBe(3)
    expect(holdAcceleration(40)).toBe(6)
  })
})
