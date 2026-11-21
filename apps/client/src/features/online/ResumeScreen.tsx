import type { PlayerIndex } from '@tank-tussle/game-core'
import type { RoomView } from '@tank-tussle/protocol'
import { useEffect, useRef, useState } from 'react'
import { useDependencies } from '../../app/dependencies.js'
import type { OnlineConnection } from '@tank-tussle/client-core'
import type { GameSession } from '@tank-tussle/client-core'
import { OnlineGameSession } from '@tank-tussle/client-core'
import { Button } from '../../shared/ui/Button.js'
import { Screen } from '../../shared/ui/Screen.js'
import styles from './online.module.css'

interface ResumeScreenProps {
  readonly connection: OnlineConnection
  readonly onRoom: (room: RoomView, you: PlayerIndex) => void
  readonly onMatch: (session: GameSession) => void
  readonly onGiveUp: () => void
}

/** Shown after a page reload while we try to reclaim the seat we had. */
export const ResumeScreen = ({ connection, onRoom, onMatch, onGiveUp }: ResumeScreenProps) => {
  const { registry } = useDependencies()
  const [error, setError] = useState<string | null>(null)
  const requested = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in development; resume only once.
    if (requested.current) return
    requested.current = true

    void connection.resume().then((outcome) => {
      if (!outcome.ok) return setError(outcome.error)
      const { room, you, match, rematchRequestedBy } = outcome.payload
      if (!match) return onRoom(room, you)
      onMatch(
        new OnlineGameSession(
          connection,
          { state: match, you, room, rematchRequestedBy },
          registry,
        ),
      )
    })
  }, [connection, registry, onRoom, onMatch])

  return (
    <Screen
      title={error ? 'Game unavailable' : 'Rejoining your game…'}
      subtitle={error ?? undefined}
    >
      {error ? (
        <Button variant="primary" onClick={onGiveUp}>
          Main menu
        </Button>
      ) : (
        <span className={styles.pulse}>Reconnecting to the server</span>
      )}
    </Screen>
  )
}
