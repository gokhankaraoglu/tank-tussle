import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useDependencies } from '../app/dependencies'
import { useAudioSettings } from '../app/hooks'
import { colors } from '../theme'

/** Mute and music switches. */
export const SoundToggles = () => {
  const { audio } = useDependencies()
  const { muted, musicEnabled } = useAudioSettings()
  return (
    <View style={styles.row}>
      <Toggle
        label={muted ? 'Unmute sound' : 'Mute sound'}
        icon={muted ? '🔇' : '🔊'}
        onPress={() => audio.settings.update({ muted: !muted })}
      />
      <Toggle
        label={musicEnabled ? 'Turn music off' : 'Turn music on'}
        icon="♪"
        dimmed={!musicEnabled}
        onPress={() => audio.settings.update({ musicEnabled: !musicEnabled })}
      />
    </View>
  )
}

interface ToggleProps {
  readonly label: string
  readonly icon: string
  readonly dimmed?: boolean
  readonly onPress: () => void
}

const Toggle = ({ label, icon, dimmed = false, onPress }: ToggleProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    hitSlop={8}
    style={[styles.toggle, dimmed && styles.dimmed]}
  >
    <Text style={styles.icon}>{icon}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  dimmed: { opacity: 0.45 },
  icon: { color: colors.text, fontSize: 15 },
})
