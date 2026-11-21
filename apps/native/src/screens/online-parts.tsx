import type { ConnectionStatus } from '@tank-tussle/client-core'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, space } from '../theme'

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Online',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
  outdated: 'Update required',
}

export const ConnectionPill = ({ status }: { readonly status: ConnectionStatus }) => (
  <Text style={[styles.pill, status === 'connected' && styles.pillOnline]}>
    {STATUS_LABELS[status]}
  </Text>
)

export const Identity = ({ name, color }: { readonly name: string; readonly color: string }) => (
  <View style={styles.identity}>
    <View style={[styles.swatch, { backgroundColor: color }]} />
    <Text style={styles.name}>{name}</Text>
  </View>
)

export const styles = StyleSheet.create({
  toolbar: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  name: { color: colors.text, fontWeight: '700' },
  pill: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.card,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  pillOnline: { color: colors.success },
  columns: { width: '100%', maxWidth: 620, flexDirection: 'row', gap: space.md },
  card: {
    flex: 1,
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  wide: { flex: 0, width: '100%', maxWidth: 620 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  codeRow: { flexDirection: 'row', gap: space.sm },
  codeInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
  roomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeBox: { alignItems: 'center', gap: space.xs },
  codeValue: { color: colors.accent, fontSize: 34, fontWeight: '800', letterSpacing: 8 },
  seats: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  seat: {
    flex: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.small,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  seatRole: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  seatName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  ready: { color: colors.success, fontSize: 12, fontWeight: '700' },
  away: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  versus: { color: colors.muted, fontWeight: '800' },
})
