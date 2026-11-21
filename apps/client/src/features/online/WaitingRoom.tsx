import type { PlayerIndex } from '@tank-tussle/game-core'
import type { MatchStartedPayload, RoomView } from '@tank-tussle/protocol'
import { useCallback, useState } from 'react'
import { useDependencies } from '../../app/dependencies.js'
import { inviteLink } from '../../app/boot.js'
import type { OnlineConnection } from '@tank-tussle/client-core'
import type { GameSession } from '@tank-tussle/client-core'
import { OnlineGameSession, useQuickMatchHost } from '@tank-tussle/client-core'
import { copyText } from '../../shared/clipboard.js'
import { Button } from '../../shared/ui/Button.js'
import { Panel, Screen } from '../../shared/ui/Screen.js'
import { ErrorText } from '../../shared/ui/TextField.js'
import { ConnectionPill } from './ConnectionPill.js'
import { ChatPanel } from '../chat/ChatPanel.js'
import { SeatCard } from './SeatCard.js'
import { useConnectionStatus } from '@tank-tussle/client-core'
import { useRoom } from '@tank-tussle/client-core'
import styles from './online.module.css'

interface WaitingRoomProps {
  readonly connection: OnlineConnection
  readonly room: RoomView
  readonly you: PlayerIndex
  readonly onMatchStarted: (session: GameSession) => void
  readonly onLeave: () => void
  /** Quick match: the host's room starts by itself and gives up if nobody joins. */
  readonly quick?: boolean
  readonly onNobodyCame?: () => void
}

/** Pre-match room: share the code, see who is here, host starts the game. */
export const WaitingRoom = ({
  connection,
  room: initialRoom,
  you,
  onMatchStarted,
  onLeave,
  quick = false,
  onNobodyCame = onLeave,
}: WaitingRoomProps) => {
  const { registry } = useDependencies()
  const status = useConnectionStatus(connection)
  const [error, setError] = useState<string | null>(null)

  const handleStarted = useCallback(
    ({ state, you: seat }: MatchStartedPayload, room: RoomView) =>
      onMatchStarted(new OnlineGameSession(connection, { state, you: seat, room }, registry)),
    [connection, registry, onMatchStarted],
  )
  const { room, closedMessage } = useRoom(connection, { room: initialRoom, you }, handleStarted)
  const isHost = you === 0
  const autoHost = quick && isHost
  const secondsLeft = useQuickMatchHost({ enabled: autoHost, connection, room, onNobodyCame })
  const code = room.id.toUpperCase()
  const canStart = isHost && room.guest?.connected === true && status === 'connected'

  const start = async () => {
    const reply = await connection.startMatch()
    setError(reply.ok ? null : reply.error)
  }

  const leave = () => {
    connection.leaveRoom()
    onLeave()
  }

  if (closedMessage) {
    return (
      <Screen title="Game closed" subtitle={closedMessage}>
        <Button variant="primary" onClick={onLeave}>
          Back to lobby
        </Button>
      </Screen>
    )
  }

  return (
    <>
      <Screen title={roomTitle(isHost, autoHost)}>
        <Panel>
          <div className={styles.room}>
            <div className={styles.toolbar}>
              <RoomChips room={room} />
              <ConnectionPill status={status} />
            </div>

            <RoomCode code={code} link={inviteLink(room.id)} />

            <div className={styles.seats}>
              <SeatCard role="Host" seat={room.host} isYou={isHost} />
              <span className={styles.versus}>VS</span>
              <SeatCard role="Guest" seat={room.guest} isYou={!isHost} />
            </div>

            <ErrorText>{error}</ErrorText>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={leave}>
                {isHost ? 'Close game' : 'Leave'}
              </Button>
              {autoHost ? (
                <QuickMatchNotice secondsLeft={secondsLeft} />
              ) : isHost ? (
                <Button variant="primary" large disabled={!canStart} onClick={() => void start()}>
                  Start match
                </Button>
              ) : (
                <span className={styles.pulse}>Waiting for the host to start…</span>
              )}
            </div>
          </div>
        </Panel>
      </Screen>
      <ChatPanel chat={connection.chat} players={[room.host, room.guest]} />
    </>
  )
}

const roomTitle = (isHost: boolean, autoHost: boolean): string => {
  if (autoHost) return 'Finding an opponent…'
  return isHost ? 'Your game' : 'Joined game'
}

const RoomChips = ({ room }: { readonly room: RoomView }) => (
  <span className={styles.chips}>
    <span className={styles.chip}>
      {room.settings.visibility === 'public' ? 'Public' : 'Private'}
    </span>
    <span className={styles.chip}>{room.settings.weaponsPerPlayer} weapons each</span>
  </span>
)

/** What a quick-match host sees instead of the start button: the room starts by itself. */
const QuickMatchNotice = ({ secondsLeft }: { readonly secondsLeft: number | null }) => (
  <span className={styles.pulse}>
    {secondsLeft === null
      ? 'Opponent found — starting…'
      : `Playing the computer in ${secondsLeft}s if nobody joins`}
  </span>
)

interface RoomCodeProps {
  readonly code: string
  readonly link: string | null
}

/** The code to share, with buttons that copy it or the invite link. */
const RoomCode = ({ code, link }: RoomCodeProps) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const copy = async (what: 'code' | 'link') => {
    const text = what === 'code' ? code : link
    if (text && (await copyText(text))) setCopied(what)
  }

  return (
    <div className={styles.code}>
      <span className={styles.muted}>Room code</span>
      <span className={styles.codeValue} aria-label={`Room code ${code.split('').join(' ')}`}>
        {code}
      </span>
      <div className={styles.actions}>
        <Button onClick={() => void copy('code')}>
          {copied === 'code' ? 'Copied!' : 'Copy code'}
        </Button>
        {link && (
          <Button onClick={() => void copy('link')}>
            {copied === 'link' ? 'Copied!' : 'Copy invite link'}
          </Button>
        )}
      </div>
    </div>
  )
}
