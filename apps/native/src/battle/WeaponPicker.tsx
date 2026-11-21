import { buildArsenal } from '@tank-tussle/client-core'
import type { MatchState, PlayerIndex, WeaponRegistry } from '@tank-tussle/game-core'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { useClickSound } from '../app/hooks'
import { colors, radius, space } from '../theme'
import { WeaponIcon, WeaponTraits } from '../ui/WeaponIcon'

interface WeaponPickerProps {
  readonly state: MatchState
  readonly player: PlayerIndex
  readonly registry: WeaponRegistry
  readonly slot: number
  readonly disabled: boolean
  readonly onSelect: (slot: number) => void
}

/** Shows the chosen weapon; tapping it opens the arsenal with what is left and what was fired. */
export const WeaponPicker = ({
  state,
  player,
  registry,
  slot,
  disabled,
  onSelect,
}: WeaponPickerProps) => {
  const [open, setOpen] = useState(false)
  const click = useClickSound()
  const inventory = state.inventories[player]
  const practice = state.config.mode === 'practice'
  const selectedId = inventory[slot]
  const selected = selectedId ? registry.get(selectedId) : null
  const arsenal = buildArsenal(inventory, practice ? [] : state.spent[player])
  const color = state.tanks[player].color

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selected ? `Weapon: ${selected.name}. Change weapon` : 'No weapons left'
        }
        disabled={disabled || inventory.length === 0}
        onPress={() => {
          click()
          setOpen(true)
        }}
        style={styles.picker}
      >
        {selectedId ? <WeaponIcon id={selectedId} size={30} /> : null}
        <Text style={[styles.pickerName, { color }]} numberOfLines={1}>
          {selected?.name ?? 'No weapons left'}
        </Text>
        <Text style={styles.hint}>▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        supportedOrientations={['landscape']}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
        >
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.label}>Choose a weapon</Text>
            <ScrollView contentContainerStyle={styles.grid}>
              {arsenal.map((entry) => {
                const weapon = registry.get(entry.id)
                const isSelected = entry.id === selectedId && entry.remaining > 0
                const used = entry.remaining === 0
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${weapon.name}, ${used ? 'used' : `${entry.remaining} left`}`}
                    accessibilityState={{ selected: isSelected, disabled: used }}
                    disabled={used}
                    onPress={() => {
                      click()
                      if (entry.nextSlot !== null) onSelect(entry.nextSlot)
                      setOpen(false)
                    }}
                    style={[
                      styles.item,
                      isSelected && { borderColor: color, backgroundColor: colors.card },
                      used && styles.used,
                    ]}
                  >
                    <WeaponIcon id={entry.id} size={36} />
                    <Text style={styles.itemName} numberOfLines={1}>
                      {weapon.name}
                    </Text>
                    <WeaponTraits traits={weapon.traits} />
                    <Text style={styles.badge}>
                      {used ? 'Used' : practice ? '∞' : `×${entry.remaining}`}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hint: { color: colors.muted, fontSize: 10 },
  picker: {
    flex: 1,
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    height: 38,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pickerName: { flex: 1, fontWeight: '800', fontSize: 14 },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    width: '86%',
    maxWidth: 620,
    maxHeight: '86%',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  item: {
    width: 108,
    alignItems: 'center',
    gap: 4,
    padding: space.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  used: { opacity: 0.35 },
  itemName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  badge: { color: colors.muted, fontSize: 11, fontWeight: '700' },
})
