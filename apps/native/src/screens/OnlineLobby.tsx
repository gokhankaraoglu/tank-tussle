import { useConnectionStatus, useOpenRooms, type OnlineConnection } from '@tank-tussle/client-core'
import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import {
  DEFAULT_ROOM_SETTINGS,
  ROOM_OPTIONS,
  type RoomSettings,
  type RoomView,
  type RoomVisibility,
  type WeaponsPerPlayer,
} from '@tank-tussle/protocol'
import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { colors } from '../theme'
import { Button } from '../ui/Button'
import { FieldLabel, Segmented, type Segment } from '../ui/fields'
import { ErrorText, Muted, Panel, Screen } from '../ui/Screen'
import { ConnectionPill, Identity, styles } from './online-parts'

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

  return (
    <Screen title="Online">
      <View style={styles.toolbar}>
        <Identity name={profile.name} color={profile.color} />
        <ConnectionPill status={status} />
      </View>

      <View style={styles.columns}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Host a game</Text>
          <Muted>Pick the rules, then share the code with a friend.</Muted>
          <Button variant="primary" disabled={!online} onPress={onCreate}>
            Create game
          </Button>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join with a code</Text>
          <View style={styles.codeRow}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={ROOM_OPTIONS.codeLength}
              placeholder="ABC123"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Room code"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Button
              variant="primary"
              disabled={!online || code.length !== ROOM_OPTIONS.codeLength || joining !== null}
              onPress={() => void join(code)}
            >
              {joining === code ? 'Joining…' : 'Join'}
            </Button>
          </View>
        </View>
      </View>

      <View style={[styles.card, styles.wide]}>
        <Text style={styles.cardTitle}>Open games</Text>
        {rooms.length === 0 ? (
          <Muted>
            {online ? 'Nobody is waiting right now. Host one!' : 'Connecting to the lobby…'}
          </Muted>
        ) : (
          rooms.map((room) => (
            <View key={room.id} style={styles.roomRow}>
              <Identity name={room.hostName} color={room.hostColor} />
              <Muted>{room.weaponsPerPlayer} weapons each</Muted>
              <Button disabled={!online || joining !== null} onPress={() => void join(room.id)}>
                {joining === room.id ? 'Joining…' : 'Join'}
              </Button>
            </View>
          ))
        )}
      </View>

      <ErrorText>{error}</ErrorText>
      <Button variant="ghost" onPress={onBack}>
        Back to menu
      </Button>
    </Screen>
  )
}

const VISIBILITY: readonly Segment<RoomVisibility>[] = [
  { value: 'public', label: 'Public', hint: 'Listed in open games' },
  { value: 'private', label: 'Private', hint: 'Only with the code' },
]

const ARSENAL: readonly Segment<WeaponsPerPlayer>[] = [
  { value: 5, label: 'Quick', hint: '5 weapons each' },
  { value: 10, label: 'Classic', hint: '10 weapons each' },
  { value: 15, label: 'Long', hint: '15 weapons each' },
]

interface CreateRoomProps {
  readonly connection: OnlineConnection
  readonly profile: PlayerProfile
  readonly onCreated: (room: RoomView, you: PlayerIndex) => void
  readonly onBack: () => void
}

export const CreateRoom = ({ connection, profile, onCreated, onBack }: CreateRoomProps) => {
  const status = useConnectionStatus(connection)
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_ROOM_SETTINGS)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setCreating(true)
    const reply = await connection.createRoom(profile, settings)
    setCreating(false)
    if (reply.ok) onCreated(reply.data.room, reply.data.you)
    else setError(reply.error)
  }

  return (
    <Screen title="Host a game">
      <Panel>
        <FieldLabel>Who can join</FieldLabel>
        <Segmented
          label="Who can join"
          value={settings.visibility}
          options={VISIBILITY}
          onChange={(visibility) => setSettings((current) => ({ ...current, visibility }))}
        />
        <FieldLabel>Match length</FieldLabel>
        <Segmented
          label="Match length"
          value={settings.weaponsPerPlayer}
          options={ARSENAL}
          onChange={(weaponsPerPlayer) =>
            setSettings((current) => ({ ...current, weaponsPerPlayer }))
          }
        />
        <ErrorText>{error}</ErrorText>
        <View style={styles.actions}>
          <Button variant="ghost" onPress={onBack}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={status !== 'connected' || creating}
            onPress={() => void submit()}
          >
            {creating ? 'Creating…' : 'Create game'}
          </Button>
        </View>
      </Panel>
    </Screen>
  )
}
