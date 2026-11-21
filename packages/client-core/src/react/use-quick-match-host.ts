import type { RoomView } from '@tank-tussle/protocol'
import { useEffect, useRef, useState } from 'react'
import type { OnlineConnection } from '../network/online-connection.js'
import { QUICK_MATCH } from '../quick-match/quick-match.js'
import { useCountdown } from './use-countdown.js'

interface QuickMatchHostOptions {
  /** False for ordinary rooms and for guests: then the hook does nothing. */
  readonly enabled: boolean
  readonly connection: OnlineConnection
  readonly room: RoomView
  /** Called after the room was left because no opponent showed up in time. */
  readonly onNobodyCame: () => void
}

/**
 * Runs a quick-match room for its host: starts the match as soon as an opponent sits down, and
 * gives up after a short wait. Returns the seconds left to wait, or null when not waiting.
 */
export const useQuickMatchHost = ({
  enabled,
  connection,
  room,
  onNobodyCame,
}: QuickMatchHostOptions): number | null => {
  const [deadline] = useState(() => Date.now() + QUICK_MATCH.waitForOpponentMs)
  const opponentHere = room.guest?.connected === true
  const waiting = enabled && !opponentHere
  const started = useRef(false)
  const giveUp = useRef(onNobodyCame)
  useEffect(() => {
    giveUp.current = onNobodyCame
  })

  useEffect(() => {
    if (!enabled || !opponentHere || started.current) return
    // A short pause so both players see who they were matched with.
    const timer = setTimeout(() => {
      started.current = true
      void connection.startMatch()
    }, QUICK_MATCH.startDelayMs)
    return () => clearTimeout(timer)
  }, [enabled, opponentHere, connection])

  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(
      () => {
        connection.leaveRoom()
        giveUp.current()
      },
      Math.max(0, deadline - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [waiting, deadline, connection])

  return useCountdown(waiting ? deadline : null)
}
