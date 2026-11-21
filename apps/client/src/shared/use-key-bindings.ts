import { useEffect, useEffectEvent } from 'react'

export type KeyHandler = (event: KeyboardEvent) => void

/** Binds `KeyboardEvent.code` values to handlers while `enabled`. */
export const useKeyBindings = (bindings: Record<string, KeyHandler>, enabled = true): void => {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)
      return
    const handler = bindings[event.code]
    if (!handler) return
    event.preventDefault()
    handler(event)
  })

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
