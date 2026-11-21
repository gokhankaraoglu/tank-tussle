import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, space } from '../theme'
import { SoundToggles } from './SoundToggles'

interface ScreenProps {
  readonly title: string
  readonly subtitle?: string
  readonly children: ReactNode
}

/** Page frame for every menu screen: title, scrolling content, sound switches in the corner. */
export const Screen = ({ title, subtitle, children }: ScreenProps) => (
  <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </ScrollView>
    <View style={styles.sound}>
      <SoundToggles />
    </View>
  </SafeAreaView>
)

export const Panel = ({ children }: { readonly children: ReactNode }) => (
  <View style={styles.panel}>{children}</View>
)

export const Muted = ({ children }: { readonly children: ReactNode }) => (
  <Text style={styles.muted}>{children}</Text>
)

export const ErrorText = ({ children }: { readonly children: string | null }) =>
  children ? (
    <Text style={styles.error} accessibilityRole="alert">
      {children}
    </Text>
  ) : null

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.lg,
  },
  title: { color: colors.accent, fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  panel: {
    width: '100%',
    maxWidth: 560,
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  muted: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  sound: { position: 'absolute', right: space.lg, bottom: space.md },
})
