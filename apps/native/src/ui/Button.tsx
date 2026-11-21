import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import { useClickSound } from '../app/hooks'
import { colors, radius, space } from '../theme'

interface ButtonProps {
  readonly children: ReactNode
  readonly onPress: () => void
  readonly variant?: 'default' | 'primary' | 'ghost'
  readonly large?: boolean
  readonly disabled?: boolean
  readonly style?: StyleProp<ViewStyle>
  readonly accessibilityLabel?: string
}

export const Button = ({
  children,
  onPress,
  variant = 'default',
  large = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) => {
  const click = useClickSound()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        click()
        onPress()
      }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        large && styles.large,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  default: { backgroundColor: colors.card },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  ghost: { backgroundColor: 'transparent' },
  large: { minHeight: 54, paddingHorizontal: space.xl },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  primaryLabel: { color: colors.accentText },
})
