import type { GameMode, MatchSetup } from '@tank-tussle/client-core'
import type { PlayerProfile } from '@tank-tussle/game-core'
import { DEFAULT_COLORS, distinctColor, PROFILE_LIMITS } from '@tank-tussle/protocol'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useDependencies } from '../app/dependencies'
import { space } from '../theme'
import { Button } from '../ui/Button'
import { ColorPicker, TextField } from '../ui/fields'
import { Panel, Screen } from '../ui/Screen'

interface PlayerSetupProps {
  readonly mode: GameMode
  readonly onSubmit: (setup: MatchSetup) => void
  readonly onBack: () => void
}

/** Names and colours for two players taking turns on this device. */
export const PlayerSetup = ({ mode, onSubmit, onBack }: PlayerSetupProps) => {
  const { profile } = useDependencies()
  const [first, setFirst] = useState<PlayerProfile>(profile.get)
  const [second, setSecond] = useState<PlayerProfile>(() => ({
    name: 'Player 2',
    color: distinctColor(DEFAULT_COLORS[1], profile.get().color),
  }))

  const submit = () => {
    profile.save(first)
    onSubmit({ mode, players: [trimName(first), trimName(second)], cpuLevel: 1 })
  }

  return (
    <Screen title="Two Players">
      <Panel>
        <View style={styles.players}>
          <ProfileFields heading="Player 1" profile={first} onChange={setFirst} />
          <ProfileFields heading="Player 2" profile={second} onChange={setSecond} />
        </View>
        <View style={styles.actions}>
          <Button variant="ghost" onPress={onBack}>
            Back
          </Button>
          <Button variant="primary" disabled={!isValid(first) || !isValid(second)} onPress={submit}>
            Continue
          </Button>
        </View>
      </Panel>
    </Screen>
  )
}

interface ProfileFieldsProps {
  readonly heading: string
  readonly profile: PlayerProfile
  readonly onChange: (profile: PlayerProfile) => void
}

export const ProfileFields = ({ heading, profile, onChange }: ProfileFieldsProps) => (
  <View style={styles.player}>
    <Text style={[styles.heading, { color: profile.color }]}>{heading}</Text>
    <TextField
      label="Name"
      value={profile.name}
      maxLength={PROFILE_LIMITS.nameMaxLength}
      onChangeText={(name) => onChange({ ...profile, name })}
      returnKeyType="done"
    />
    <ColorPicker
      label={`${heading} colour`}
      value={profile.color}
      onChange={(color) => onChange({ ...profile, color })}
    />
  </View>
)

const trimName = (profile: PlayerProfile): PlayerProfile => ({
  ...profile,
  name: profile.name.trim(),
})
const isValid = (profile: PlayerProfile): boolean => profile.name.trim().length > 0

const styles = StyleSheet.create({
  players: { flexDirection: 'row', gap: space.lg },
  player: { flex: 1, gap: space.sm },
  heading: { fontSize: 16, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
})
