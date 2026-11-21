import { findQuickMatch, LADDER, type OnlineConnection } from '@tank-tussle/client-core'
import type { PlayerIndex, PlayerProfile } from '@tank-tussle/game-core'
import type { RoomView } from '@tank-tussle/protocol'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useClickSound } from '../app/hooks'
import { colors, radius, space } from '../theme'
import { Button } from '../ui/Button'
import { Muted, Panel, Screen } from '../ui/Screen'
import { Card } from './MainMenu'
import { ProfileFields } from './PlayerSetup'

interface LadderScreenProps {
  /** Highest level beaten so far. */
  readonly beaten: number
  readonly onChallenge: (level: number) => void
  readonly onBack: () => void
}

type RungState = 'beaten' | 'next' | 'locked'

const STATE_LABELS: Record<RungState, string> = {
  beaten: 'Beaten · play again',
  next: 'Challenge',
  locked: 'Locked',
}

const stateOf = (level: number, beaten: number): RungState => {
  if (level <= beaten) return 'beaten'
  return level === beaten + 1 ? 'next' : 'locked'
}

/** The solo progression: each win unlocks a stronger computer opponent. */
export const LadderScreen = ({ beaten, onChallenge, onBack }: LadderScreenProps) => {
  const click = useClickSound()
  return (
    <Screen
      title="Ladder"
      subtitle={
        beaten >= LADDER.length
          ? 'You beat every opponent. Legend!'
          : 'Beat an opponent to unlock the next one'
      }
    >
      <View style={styles.ladder}>
        {LADDER.map(({ level, name }) => {
          const state = stateOf(level, beaten)
          return (
            <Pressable
              key={level}
              accessibilityRole="button"
              accessibilityLabel={`${level}. ${name}. ${STATE_LABELS[state]}`}
              accessibilityState={{ disabled: state === 'locked' }}
              disabled={state === 'locked'}
              onPress={() => {
                click()
                onChallenge(level)
              }}
              style={[
                styles.rung,
                state === 'next' && styles.next,
                state === 'locked' && styles.locked,
              ]}
            >
              <Text style={styles.rungLevel}>{level}</Text>
              <Text style={styles.rungName}>{name}</Text>
              <Text style={[styles.rungState, state === 'beaten' && styles.beaten]}>
                {STATE_LABELS[state]}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Button variant="ghost" onPress={onBack}>
        Back
      </Button>
    </Screen>
  )
}

interface FriendScreenProps {
  readonly onSameDevice: () => void
  readonly onOnline: () => void
  readonly onBack: () => void
}

export const FriendScreen = ({ onSameDevice, onOnline, onBack }: FriendScreenProps) => {
  const click = useClickSound()
  const press = (action: () => void) => () => {
    click()
    action()
  }
  return (
    <Screen title="Play with a friend">
      <View style={styles.cards}>
        <Card
          title="On this device"
          subtitle="Take turns on one screen"
          onPress={press(onSameDevice)}
        />
        <Card
          title="Online"
          subtitle="Host a game and share the code, or join one"
          onPress={press(onOnline)}
        />
      </View>
      <Button variant="ghost" onPress={onBack}>
        Back
      </Button>
    </Screen>
  )
}

interface ProfileScreenProps {
  readonly profile: PlayerProfile
  readonly onSave: (profile: PlayerProfile) => void
  readonly onBack: () => void
}

/** The name and colour used for quick matches, the ladder and online games. */
export const ProfileScreen = ({ profile, onSave, onBack }: ProfileScreenProps) => {
  const [draft, setDraft] = useState(profile)
  return (
    <Screen title="Your tank">
      <Panel>
        <ProfileFields heading="You" profile={draft} onChange={setDraft} />
        <View style={styles.actions}>
          <Button variant="ghost" onPress={onBack}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={draft.name.trim().length === 0}
            onPress={() => onSave(draft)}
          >
            Save
          </Button>
        </View>
      </Panel>
    </Screen>
  )
}

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
      <Muted>Looking for someone to play</Muted>
      <Button variant="ghost" onPress={onCancel}>
        Cancel
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  ladder: { width: '100%', maxWidth: 520, gap: space.sm },
  rung: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  next: { borderColor: colors.accent, backgroundColor: colors.card },
  locked: { opacity: 0.45 },
  rungLevel: { width: 28, color: colors.accent, fontSize: 20, fontWeight: '900' },
  rungName: { flex: 1, color: colors.text, fontWeight: '700' },
  rungState: { color: colors.muted, fontSize: 12 },
  beaten: { color: colors.secondary },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
})
