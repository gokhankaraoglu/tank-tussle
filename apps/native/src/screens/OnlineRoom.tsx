import {
  OnlineGameSession,
  useQuickMatchHost,
  useConnectionStatus,
  useCountdown,
  useRoom,
  type GameSession,
  type OnlineConnection,
} from '@tank-tussle/client-core'
import type { PlayerIndex } from '@tank-tussle/game-core'
import type { MatchStartedPayload, RoomView, SeatView } from '@tank-tussle/protocol'
import * as Clipboard from 'expo-clipboard'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { useDependencies } from '../app/dependencies'
import { ChatPanel } from '../chat/ChatPanel'
import { Button } from '../ui/Button'
import { ErrorText, Muted, Panel, Screen } from '../ui/Screen'
import { ConnectionPill, styles } from './online-parts'

interface SeatCardProps {
  readonly role: 'Host' | 'Guest'
  readonly seat: SeatView | null
  readonly isYou: boolean
}

const SeatCard = ({ role, seat, isYou }: SeatCardProps) => {
  const secondsLeft = useCountdown(seat?.connected === false ? seat.reconnectDeadline : null)
  return (
    <View style={[styles.seat, seat ? { borderColor: seat.color } : null]}>
      <Text style={styles.seatRole}>
        {role}
        {isYou ? ' · you' : ''}
      </Text>
      {seat ? (
        <>
          <Text style={styles.seatName}>{seat.name}</Text>
          <Text style={seat.connected ? styles.ready : styles.away}>
            {seat.connected ? 'Ready' : `Reconnecting… ${secondsLeft ?? ''}s`}
          </Text>
        </>
      ) : (
        <Muted>Waiting for an opponent…</Muted>
      )}
    </View>
  )
}

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

  if (closedMessage) {
    return (
      <Screen title="Game closed" subtitle={closedMessage}>
        <Button variant="primary" onPress={onLeave}>
          Back to lobby
        </Button>
      </Screen>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen title={roomTitle(isHost, autoHost)}>
        <Panel>
          <View style={styles.toolbar}>
            <Muted>
              {room.settings.visibility === 'public' ? 'Public' : 'Private'} ·{' '}
              {room.settings.weaponsPerPlayer} weapons each
            </Muted>
            <ConnectionPill status={status} />
          </View>

          <RoomCode code={code} />

          <View style={styles.seats}>
            <SeatCard role="Host" seat={room.host} isYou={isHost} />
            <Text style={styles.versus}>VS</Text>
            <SeatCard role="Guest" seat={room.guest} isYou={!isHost} />
          </View>

          <ErrorText>{error}</ErrorText>
          <View style={styles.actions}>
            <Button
              variant="ghost"
              onPress={() => {
                connection.leaveRoom()
                onLeave()
              }}
            >
              {isHost ? 'Close game' : 'Leave'}
            </Button>
            {autoHost ? (
              <QuickMatchNotice secondsLeft={secondsLeft} />
            ) : isHost ? (
              <Button variant="primary" disabled={!canStart} onPress={() => void start()}>
                Start match
              </Button>
            ) : (
              <Muted>Waiting for the host to start…</Muted>
            )}
          </View>
        </Panel>
      </Screen>
      <ChatPanel chat={connection.chat} players={[room.host, room.guest]} />
    </View>
  )
}

/** The code to share, with a button that copies it. */
const RoomCode = ({ code }: { readonly code: string }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await Clipboard.setStringAsync(code)
    setCopied(true)
  }
  return (
    <View style={styles.codeBox}>
      <Muted>Room code</Muted>
      <Text style={styles.codeValue} accessibilityLabel={`Room code ${code.split('').join(' ')}`}>
        {code}
      </Text>
      <Button onPress={() => void copy()}>{copied ? 'Copied!' : 'Copy code'}</Button>
    </View>
  )
}

/** What a quick-match host sees instead of the start button: the room starts by itself. */
const QuickMatchNotice = ({ secondsLeft }: { readonly secondsLeft: number | null }) => (
  <Muted>
    {secondsLeft === null
      ? 'Opponent found — starting…'
      : `Playing the computer in ${secondsLeft}s if nobody joins`}
  </Muted>
)

const roomTitle = (isHost: boolean, autoHost: boolean): string => {
  if (autoHost) return 'Finding an opponent…'
  return isHost ? 'Your game' : 'Joined game'
}

interface ResumeScreenProps {
  readonly connection: OnlineConnection
  readonly onRoom: (room: RoomView, you: PlayerIndex) => void
  readonly onMatch: (session: GameSession) => void
  readonly onGiveUp: () => void
}

/** Shown at launch while we try to reclaim the seat we had when the app was closed. */
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
        <Button variant="primary" onPress={onGiveUp}>
          Main menu
        </Button>
      ) : (
        <Muted>Reconnecting to the server</Muted>
      )}
    </Screen>
  )
}
