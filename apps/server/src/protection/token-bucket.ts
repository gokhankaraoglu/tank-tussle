/**
 * Classic token bucket: up to `capacity` messages in a burst, refilled at `refillPerSecond`.
 * A client within its rate never notices it; a flood gets throttled.
 */
export class TokenBucket {
  private tokens: number
  private updatedAt: number

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity
    this.updatedAt = now()
  }

  /** Spends one token if there is one. */
  take(): boolean {
    const now = this.now()
    const refilled = ((now - this.updatedAt) / 1000) * this.refillPerSecond
    this.tokens = Math.min(this.capacity, this.tokens + refilled)
    this.updatedAt = now
    if (this.tokens < 1) return false
    this.tokens -= 1
    return true
  }
}
