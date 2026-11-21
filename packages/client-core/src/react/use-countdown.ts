import { useEffect, useState } from 'react'

/** Whole seconds left until `deadline` (epoch ms), re-rendering as it ticks. Null if no deadline. */
export const useCountdown = (deadline: number | null): number | null => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline === null) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [deadline])

  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
}
