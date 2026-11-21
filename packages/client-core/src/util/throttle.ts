export interface Throttled<A extends unknown[]> {
  (...args: A): void
  /** Drops a pending trailing call. */
  cancel(): void
}

/**
 * Calls `fn` at most once per `intervalMs`, always delivering the latest arguments last,
 * so the final value of a drag reaches the server.
 */
export const throttle = <A extends unknown[]>(
  fn: (...args: A) => void,
  intervalMs: number,
): Throttled<A> => {
  let last = -Infinity
  let pending: A | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    timer = null
    if (!pending) return
    last = Date.now()
    const args = pending
    pending = null
    fn(...args)
  }

  const throttled = (...args: A) => {
    pending = args
    const wait = last + intervalMs - Date.now()
    if (wait <= 0 && !timer) flush()
    else timer ??= setTimeout(flush, Math.max(0, wait))
  }
  throttled.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }
  return throttled
}
