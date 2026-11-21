import { PLAYER_COLORS } from '@tank-tussle/protocol'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, radius, space } from '../theme'

export const FieldLabel = ({ children }: { readonly children: string }) => (
  <Text style={styles.label}>{children}</Text>
)

export const TextField = ({ label, style, ...props }: TextInputProps & { label: string }) => (
  <View style={styles.field}>
    <FieldLabel>{label}</FieldLabel>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={colors.muted}
      autoCorrect={false}
      {...props}
      style={[styles.input, style]}
    />
  </View>
)

interface ColorPickerProps {
  readonly label: string
  readonly value: string
  readonly onChange: (color: string) => void
}

export const ColorPicker = ({ label, value, onChange }: ColorPickerProps) => (
  <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel={label}>
    {PLAYER_COLORS.map((color) => (
      <Pressable
        key={color.value}
        accessibilityRole="radio"
        accessibilityLabel={color.name}
        accessibilityState={{ selected: color.value === value }}
        onPress={() => onChange(color.value)}
        hitSlop={4}
        style={[
          styles.swatch,
          { backgroundColor: color.value },
          color.value === value && styles.swatchOn,
        ]}
      />
    ))}
  </View>
)

export interface Segment<T> {
  readonly value: T
  readonly label: string
  readonly hint?: string
}

interface SegmentedProps<T> {
  readonly label: string
  readonly value: T
  readonly options: readonly Segment<T>[]
  readonly onChange: (value: T) => void
}

export const Segmented = <T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) => (
  <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel={label}>
    {options.map((option) => {
      const selected = option.value === value
      return (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          onPress={() => onChange(option.value)}
          style={[styles.segment, selected && styles.segmentOn]}
        >
          <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>
            {option.label}
          </Text>
          {option.hint ? <Text style={styles.segmentHint}>{option.hint}</Text> : null}
        </Pressable>
      )
    })}
  </View>
)

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 16,
  },
  swatches: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.text },
  segments: { flexDirection: 'row', gap: space.sm },
  segment: {
    flex: 1,
    padding: space.sm,
    alignItems: 'center',
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  segmentOn: { borderColor: colors.secondary, backgroundColor: colors.card },
  segmentLabel: { color: colors.muted, fontWeight: '700' },
  segmentLabelOn: { color: colors.text },
  segmentHint: { color: colors.muted, fontSize: 11 },
})
