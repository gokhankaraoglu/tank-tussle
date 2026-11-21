/** Delayed callbacks, injectable so tests can run CPU turns instantly. */
export interface Scheduler {
  schedule(callback: () => void, delayMs: number): () => void
}

export const browserScheduler: Scheduler = {
  schedule(callback, delayMs) {
    const handle = setTimeout(callback, delayMs)
    return () => clearTimeout(handle)
  },
}
