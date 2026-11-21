import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

const FIRST_DELAY_MS = 380
const FASTEST_DELAY_MS = 40

/**
 * Step multiplier for the n-th repeat while a button is held: start fine, then speed up so
 * long sweeps don't take forever.
 */
export const holdAcceleration = (repeat: number): number => {
  if (repeat < 12) return 1
  return repeat < 30 ? 3 : 6
}

/** Keeps receiving pointerup even if the finger slides off. Unknown pointers can't be captured. */
const capturePointer = (event: PointerEvent<HTMLElement>): void => {
  try {
    event.currentTarget.setPointerCapture(event.pointerId)
  } catch {
    // Not an active pointer (e.g. synthetic events); repeating still works without capture.
  }
}

export interface HoldRepeatHandlers {
  onPointerDown(event: PointerEvent<HTMLElement>): void
  onPointerUp(): void
  onPointerCancel(): void
  onLostPointerCapture(): void
  onClick(event: MouseEvent<HTMLElement>): void
}

/**
 * Press-and-hold behaviour for nudge buttons. `action` receives the repeat count (0 for the
 * first press). Keyboard activation (Enter/Space) still triggers a single step.
 */
export const useHoldRepeat = (
  action: (repeat: number) => void,
  enabled: boolean,
): HoldRepeatHandlers => {
  const latest = useRef(action)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    latest.current = action
  })

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => {
    if (!enabled) stop()
  }, [enabled])
  useEffect(() => stop, [])

  return {
    onPointerDown(event) {
      if (!enabled || event.button !== 0) return
      capturePointer(event)
      stop()
      latest.current(0)
      let repeat = 1
      let delay = FIRST_DELAY_MS
      const tick = () => {
        latest.current(repeat++)
        delay = Math.max(FASTEST_DELAY_MS, delay * 0.75)
        timer.current = window.setTimeout(tick, delay)
      }
      timer.current = window.setTimeout(tick, delay)
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onClick(event) {
      // Pointer presses are handled on pointerdown; only keyboard clicks (detail 0) act here.
      if (enabled && event.detail === 0) latest.current(0)
    },
  }
}
