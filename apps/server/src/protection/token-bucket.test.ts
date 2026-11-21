import { describe, expect, it } from 'vitest'
import { TokenBucket } from './token-bucket.js'

describe('TokenBucket', () => {
  it('allows a burst up to its capacity, then refuses', () => {
    const bucket = new TokenBucket(3, 1, () => 0)
    expect([bucket.take(), bucket.take(), bucket.take(), bucket.take()]).toEqual([
      true,
      true,
      true,
      false,
    ])
  })

  it('refills over time but never above capacity', () => {
    let now = 0
    const bucket = new TokenBucket(2, 10, () => now)
    bucket.take()
    bucket.take()
    now = 100 // 0.1 s at 10 per second: one token back
    expect(bucket.take()).toBe(true)
    expect(bucket.take()).toBe(false)
    now = 60_000
    expect([bucket.take(), bucket.take(), bucket.take()]).toEqual([true, true, false])
  })
})
