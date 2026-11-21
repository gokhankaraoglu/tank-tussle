import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttle } from './throttle.js'

describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sends the first call at once and the latest one after the interval', () => {
    const sent: number[] = []
    const send = throttle((value: number) => sent.push(value), 50)
    send(1)
    send(2)
    send(3)
    expect(sent).toEqual([1])
    vi.advanceTimersByTime(50)
    expect(sent).toEqual([1, 3])
  })

  it('can drop a pending call', () => {
    const sent: number[] = []
    const send = throttle((value: number) => sent.push(value), 50)
    send(1)
    send(2)
    send.cancel()
    vi.advanceTimersByTime(100)
    expect(sent).toEqual([1])
  })
})
