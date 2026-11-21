import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import {
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings,
  type RoomView,
  type RoomVisibility,
  type WeaponsPerPlayer,
} from '@tank-tussle/protocol'
import { useState, type FormEvent } from 'react'
import type { OnlineConnection } from '@tank-tussle/client-core'
import { Button } from '../../shared/ui/Button.js'
import { Panel, Screen } from '../../shared/ui/Screen.js'
import { SegmentedControl, type Segment } from '../../shared/ui/SegmentedControl.js'
import { ErrorText, FieldLabel } from '../../shared/ui/TextField.js'
import { useConnectionStatus } from '@tank-tussle/client-core'
import styles from './online.module.css'

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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setCreating(true)
    const reply = await connection.createRoom(profile, settings)
    setCreating(false)
    if (reply.ok) onCreated(reply.data.room, reply.data.you)
    else setError(reply.error)
  }

  return (
    <Screen title="Host a game">
      <Panel>
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <div className={styles.field}>
            <FieldLabel>Who can join</FieldLabel>
            <SegmentedControl
              label="Who can join"
              value={settings.visibility}
              options={VISIBILITY}
              onChange={(visibility) => setSettings((current) => ({ ...current, visibility }))}
            />
          </div>
          <div className={styles.field}>
            <FieldLabel>Match length</FieldLabel>
            <SegmentedControl
              label="Match length"
              value={settings.weaponsPerPlayer}
              options={ARSENAL}
              onChange={(weaponsPerPlayer) =>
                setSettings((current) => ({ ...current, weaponsPerPlayer }))
              }
            />
          </div>
          <ErrorText>{error}</ErrorText>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button variant="primary" type="submit" disabled={status !== 'connected' || creating}>
              {creating ? 'Creating…' : 'Create game'}
            </Button>
          </div>
        </form>
      </Panel>
    </Screen>
  )
}
