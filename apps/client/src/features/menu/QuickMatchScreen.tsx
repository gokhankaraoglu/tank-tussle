import { findQuickMatch, type OnlineConnection } from '@tank-tussle/client-core'
import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import type { RoomView } from '@tank-tussle/protocol'
import { useEffect, useRef } from 'react'
import { Button } from '../../shared/ui/Button.js'
import { Screen } from '../../shared/ui/Screen.js'
import styles from './menu.module.css'

interface QuickMatchScreenProps {
  readonly connection: OnlineConnection
  readonly profile: PlayerProfile
  readonly onRoom: (room: RoomView, you: PlayerIndex) => void
  /** The server could not be reached: play the computer instead. */
  readonly onUnavailable: () => void
  readonly onCancel: () => void
}

/** Shown for a moment after "Play" while we look for a seat in a public game. */
export const QuickMatchScreen = ({
  connection,
  profile,
  onRoom,
  onUnavailable,
  onCancel,
}: QuickMatchScreenProps) => {
  const requested = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in development; search only once.
    if (requested.current) return
    requested.current = true
    void findQuickMatch(connection, profile).then((result) => {
      if (result.kind === 'room') onRoom(result.room, result.you)
      else onUnavailable()
    })
  }, [connection, profile, onRoom, onUnavailable])

  return (
    <Screen title="Finding an opponent…">
      <span className={styles.pulse}>Looking for someone to play</span>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </Screen>
  )
}
