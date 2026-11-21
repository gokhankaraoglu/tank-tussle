import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import { ROOM_OPTIONS, type RoomView } from '@tank-tussle/protocol'
import { useState, type FormEvent } from 'react'
import type { OnlineConnection } from '@tank-tussle/client-core'
import { Button } from '../../shared/ui/Button.js'
import { Screen } from '../../shared/ui/Screen.js'
import { ErrorText } from '../../shared/ui/TextField.js'
import { ConnectionPill } from './ConnectionPill.js'
import { useConnectionStatus } from '@tank-tussle/client-core'
import { useOpenRooms } from '@tank-tussle/client-core'
import styles from './online.module.css'

interface OnlineHubProps {
  readonly connection: OnlineConnection
  readonly profile: PlayerProfile
  readonly initialCode?: string
  readonly onJoined: (room: RoomView, you: PlayerIndex) => void
  readonly onCreate: () => void
  readonly onBack: () => void
}

/** Entry point for online play: host a game, join by code, or pick an open game. */
export const OnlineHub = ({
  connection,
  profile,
  initialCode,
  onJoined,
  onCreate,
  onBack,
}: OnlineHubProps) => {
  const status = useConnectionStatus(connection)
  const rooms = useOpenRooms(connection)
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  const online = status === 'connected'

  const join = async (roomId: string) => {
    setJoining(roomId)
    const reply = await connection.joinRoom(roomId, profile)
    setJoining(null)
    if (reply.ok) onJoined(reply.data.room, reply.data.you)
    else setError(reply.error)
  }

  const submitCode = (event: FormEvent) => {
    event.preventDefault()
    void join(code)
  }

  return (
    <Screen title="Online">
      <div className={styles.toolbar}>
        <span className={styles.identity}>
          <span className={styles.swatch} style={{ background: profile.color }} />
          {profile.name}
        </span>
        <ConnectionPill status={status} />
      </div>

      <div className={styles.hub}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Host a game</h2>
          <p className={styles.muted}>Pick the rules, then share the code with a friend.</p>
          <Button variant="primary" large disabled={!online} onClick={onCreate}>
            Create game
          </Button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Join with a code</h2>
          <form className={styles.codeForm} onSubmit={submitCode}>
            <input
              className={styles.codeInput}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              maxLength={ROOM_OPTIONS.codeLength}
              placeholder="ABC123"
              aria-label="Room code"
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              variant="primary"
              type="submit"
              disabled={!online || code.length !== ROOM_OPTIONS.codeLength || joining !== null}
            >
              {joining === code ? 'Joining…' : 'Join'}
            </Button>
          </form>
        </section>

        <section className={`${styles.card} ${styles.wide}`}>
          <h2 className={styles.cardTitle}>Open games</h2>
          {rooms.length === 0 ? (
            <p className={styles.muted}>
              {online ? 'Nobody is waiting right now. Host one!' : 'Connecting to the lobby…'}
            </p>
          ) : (
            <ul className={styles.roomList}>
              {rooms.map((room) => (
                <li key={room.id} className={styles.roomRow}>
                  <span className={styles.identity}>
                    <span className={styles.swatch} style={{ background: room.hostColor }} />
                    {room.hostName}
                  </span>
                  <span className={styles.muted}>{room.weaponsPerPlayer} weapons each</span>
                  <Button disabled={!online || joining !== null} onClick={() => void join(room.id)}>
                    {joining === room.id ? 'Joining…' : 'Join'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ErrorText>{error}</ErrorText>
      <Button variant="ghost" onClick={onBack}>
        Back to menu
      </Button>
    </Screen>
  )
}
