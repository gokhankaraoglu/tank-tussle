import { AIM_STEPS, roundAim } from '@tank-tussle/client-core'
import { comboMultiplier, TANK, type MatchState, type PlayerIndex } from '@tank-tussle/game-core'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { holdAcceleration, useClickSound, useHoldRepeat } from '../app/hooks'
import { colors, radius, space, withAlpha } from '../theme'

interface AimStepperProps {
  readonly label: string
  readonly hint?: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly unit?: string
  readonly disabled: boolean
  readonly onChange: (value: number) => void
}

/** One aim value (angle or power): hold-to-repeat buttons above and below the number. */
export const AimStepper = ({
  label,
  hint,
  value,
  min,
  max,
  unit = '',
  disabled,
  onChange,
}: AimStepperProps) => {
  const set = (next: number) => onChange(roundAim(Math.min(max, Math.max(min, next))))
  const increase = useHoldRepeat(
    (repeat) => set(value + AIM_STEPS.normal * holdAcceleration(repeat)),
    !disabled && value < max,
  )
  const decrease = useHoldRepeat(
    (repeat) => set(value - AIM_STEPS.normal * holdAcceleration(repeat)),
    !disabled && value > min,
  )
  return (
    <View style={styles.stepper}>
      <Text style={styles.label}>
        {label}
        {hint ? <Text style={styles.hint}> {hint}</Text> : null}
      </Text>
      <Nudge
        label={`Increase ${label}`}
        icon="▲"
        disabled={disabled || value >= max}
        {...increase}
      />
      <Text style={styles.value}>
        {value.toFixed(1)}
        {unit}
      </Text>
      <Nudge
        label={`Decrease ${label}`}
        icon="▼"
        disabled={disabled || value <= min}
        {...decrease}
      />
    </View>
  )
}

interface NudgeProps {
  readonly label: string
  readonly icon: string
  readonly disabled: boolean
  readonly onPressIn: () => void
  readonly onPressOut: () => void
}

const Nudge = ({ label, icon, disabled, onPressIn, onPressOut }: NudgeProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint="Hold to repeat"
    disabled={disabled}
    onPressIn={onPressIn}
    onPressOut={onPressOut}
    style={({ pressed }) => [styles.nudge, pressed && styles.pressed, disabled && styles.disabled]}
  >
    <Text style={styles.nudgeIcon}>{icon}</Text>
  </Pressable>
)

interface MoveControlProps {
  readonly movesLeft: number
  readonly disabled: boolean
  readonly onMove: (direction: -1 | 1) => void
}

export const MoveControl = ({ movesLeft, disabled, onMove }: MoveControlProps) => {
  const click = useClickSound()
  const blocked = disabled || movesLeft <= 0
  const button = (direction: -1 | 1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction < 0 ? 'Move left' : 'Move right'}
      disabled={blocked}
      onPress={() => {
        click()
        onMove(direction)
      }}
      style={({ pressed }) => [styles.move, pressed && styles.pressed, blocked && styles.disabled]}
    >
      <Text style={styles.moveIcon}>{direction < 0 ? '◀' : '▶'}</Text>
    </Pressable>
  )
  return (
    <View style={styles.moveBox}>
      <View style={styles.moveRow}>
        {button(-1)}
        {button(1)}
      </View>
      <View style={styles.pips} accessibilityLabel={`${movesLeft} moves left`}>
        {Array.from({ length: TANK.movesPerMatch }, (_, index) => (
          <View key={index} style={[styles.pip, index >= movesLeft && styles.pipUsed]} />
        ))}
      </View>
    </View>
  )
}

interface PlayerCardProps {
  readonly state: MatchState
  readonly player: PlayerIndex
}

export const PlayerCard = ({ state, player }: PlayerCardProps) => {
  const tank = state.tanks[player]
  const streak = state.streaks[player]
  const active = state.phase === 'playing' && state.turn === player
  return (
    <View
      style={[styles.card, { borderTopColor: tank.color }, active && { borderColor: tank.color }]}
    >
      <Text style={styles.cardName} numberOfLines={1}>
        {tank.name}
      </Text>
      <Text style={[styles.score, { color: tank.color }]}>{tank.score}</Text>
      {streak > 0 && <Text style={styles.combo}>🔥 ×{comboMultiplier(streak)}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  stepper: { alignItems: 'stretch', gap: 4 },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  hint: { color: colors.muted, fontSize: 10, fontWeight: '600', textTransform: 'none' },
  value: {
    paddingVertical: 4,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    overflow: 'hidden',
  },
  nudge: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  nudgeIcon: { color: colors.text, fontSize: 16 },
  pressed: { opacity: 0.7, borderColor: colors.secondary },
  disabled: { opacity: 0.4 },
  moveBox: { gap: 4 },
  moveRow: { flexDirection: 'row', gap: 5 },
  move: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.small,
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: withAlpha(colors.secondary, 0.14),
  },
  moveIcon: { color: colors.text, fontSize: 15 },
  pips: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  pipUsed: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  card: {
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.small,
    borderWidth: 1,
    borderTopWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  cardName: { maxWidth: 90, color: colors.text, fontSize: 12, fontWeight: '700' },
  score: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  combo: { color: colors.accent, fontSize: 11, fontWeight: '700' },
})
