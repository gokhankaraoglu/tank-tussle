import { LADDER } from '@tank-tussle/client-core'
import type { PlayerProfile } from '@tank-tussle/game-core'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useClickSound } from '../app/hooks'
import { colors, radius, space } from '../theme'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'

interface MainMenuProps {
  readonly profile: PlayerProfile
  /** Highest ladder level beaten so far. */
  readonly ladderBeaten: number
  readonly onPlay: () => void
  readonly onLadder: () => void
  readonly onFriend: () => void
  readonly onPractice: () => void
  readonly onProfile: () => void
}

/** One big button to play right away; everything else is one step further. */
export const MainMenu = ({
  profile,
  ladderBeaten,
  onPlay,
  onLadder,
  onFriend,
  onPractice,
  onProfile,
}: MainMenuProps) => {
  const click = useClickSound()
  const press = (action: () => void) => () => {
    click()
    action()
  }

  return (
    <Screen title="Tank Tussle" subtitle="The fastest artillery game you'll ever play">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Your tank: ${profile.name}. Edit`}
        onPress={press(onProfile)}
        style={styles.profile}
      >
        <View style={[styles.swatch, { backgroundColor: profile.color }]} />
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play. Find an opponent or take on the computer"
        onPress={press(onPlay)}
        style={({ pressed }) => [styles.play, pressed && styles.pressed]}
      >
        <Text style={styles.playTitle}>PLAY</Text>
        <Text style={styles.playSubtitle}>Find an opponent — or take on the computer</Text>
      </Pressable>

      <View style={styles.modes}>
        <Card
          title="Ladder"
          subtitle={`Beat the computer, rung by rung · ${ladderBeaten}/${LADDER.length}`}
          onPress={press(onLadder)}
        />
        <Card
          title="Play with a friend"
          subtitle="On this device or online with a code"
          onPress={press(onFriend)}
        />
      </View>

      <Button variant="ghost" onPress={onPractice}>
        Practice
      </Button>
    </Screen>
  )
}

interface CardProps {
  readonly title: string
  readonly subtitle: string
  readonly onPress: () => void
}

export const Card = ({ title, subtitle, onPress }: CardProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${title}. ${subtitle}`}
    onPress={onPress}
    style={({ pressed }) => [styles.mode, pressed && styles.modePressed]}
  >
    <Text style={styles.modeTitle}>{title}</Text>
    <Text style={styles.modeSubtitle}>{subtitle}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  profileName: { color: colors.text, fontWeight: '700' },
  edit: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  play: {
    width: '100%',
    maxWidth: 592,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.lg,
    borderRadius: radius.medium,
    backgroundColor: colors.accent,
  },
  pressed: { opacity: 0.85 },
  playTitle: { color: colors.accentText, fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  playSubtitle: { color: colors.accentText, fontWeight: '600' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  mode: {
    width: 290,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  modePressed: { borderColor: colors.secondary },
  modeTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  modeSubtitle: { color: colors.muted, fontSize: 13 },
})
