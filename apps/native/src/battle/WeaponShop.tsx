import type { MatchState, PlayerIndex, WeaponRegistry } from '@tank-tussle/game-core'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useClickSound } from '../app/hooks'
import { colors, radius, space } from '../theme'
import { Button } from '../ui/Button'
import { SoundToggles } from '../ui/SoundToggles'
import { WeaponIcon, WeaponTraits } from '../ui/WeaponIcon'

interface WeaponShopProps {
  readonly state: MatchState
  readonly registry: WeaponRegistry
  /** True when the player on pick is controlled by this device. */
  readonly canPick: boolean
  readonly onPick: (poolIndex: number) => void
  /** Deals every remaining weapon at random to both players. */
  readonly onDealAll: () => void
}

/** Players take turns drafting from a fixed pool; taken weapons stay visible with their owner. */
export const WeaponShop = ({ state, registry, canPick, onPick, onDealAll }: WeaponShopProps) => {
  const click = useClickSound()
  const picker = state.tanks[state.shop.picker]

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Weapon Shop</Text>
        <Text style={[styles.turn, { color: picker.color }]} accessibilityLiveRegion="polite">
          {canPick ? `${picker.name}, pick a weapon` : `Waiting for ${picker.name}…`}
        </Text>
        <SoundToggles />
        <Button variant="primary" disabled={!canPick} onPress={onDealAll}>
          Random · deal all
        </Button>
      </View>

      <View style={styles.body}>
        <Inventory state={state} player={0} />
        <ScrollView contentContainerStyle={styles.pool}>
          {state.shop.pool.map((id, slot) => {
            const weapon = registry.get(id)
            const owner = state.shop.takenBy[slot] ?? null
            const ownerTank = owner === null ? null : state.tanks[owner]
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityLabel={
                  ownerTank ? `${weapon.name}, taken by ${ownerTank.name}` : weapon.name
                }
                disabled={ownerTank !== null || !canPick}
                onPress={() => {
                  click()
                  onPick(slot)
                }}
                style={({ pressed }) => [
                  styles.weapon,
                  pressed && { borderColor: picker.color },
                  ownerTank && { borderColor: ownerTank.color, opacity: 0.55 },
                ]}
              >
                <View style={styles.weaponHead}>
                  <WeaponIcon id={id} size={34} />
                  <View style={styles.weaponTitle}>
                    <Text style={styles.weaponName} numberOfLines={1}>
                      {weapon.name}
                    </Text>
                    <Text style={styles.rating}>
                      {'★'.repeat(weapon.rating)}
                      {'☆'.repeat(5 - weapon.rating)}
                    </Text>
                  </View>
                </View>
                {ownerTank ? (
                  <Text style={[styles.owner, { color: ownerTank.color }]}>
                    Taken by {ownerTank.name}
                  </Text>
                ) : (
                  <>
                    <WeaponTraits traits={weapon.traits} />
                    <Text style={styles.description} numberOfLines={3}>
                      {weapon.description}
                    </Text>
                  </>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
        <Inventory state={state} player={1} />
      </View>
    </SafeAreaView>
  )
}

/** A player's picks so far. */
const Inventory = ({
  state,
  player,
}: {
  readonly state: MatchState
  readonly player: PlayerIndex
}) => {
  const tank = state.tanks[player]
  const items = state.inventories[player]
  const picking = state.shop.picker === player
  return (
    <View style={[styles.inventory, picking && { borderColor: tank.color }]}>
      <Text style={[styles.inventoryTitle, { color: tank.color }]} numberOfLines={1}>
        {tank.name}
      </Text>
      <Text style={styles.count}>
        {items.length}/{state.config.weaponsPerPlayer}
      </Text>
      <View style={styles.icons}>
        {items.map((id, index) => (
          <WeaponIcon key={`${id}-${index}`} id={id} size={22} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  turn: { flex: 1, textAlign: 'center', fontWeight: '700' },
  body: { flex: 1, flexDirection: 'row', gap: space.sm },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  weapon: {
    width: 168,
    gap: 4,
    padding: space.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  weaponHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  weaponTitle: { flex: 1 },
  weaponName: { color: colors.text, fontWeight: '800' },
  rating: { color: colors.accent, fontSize: 11 },
  owner: { fontSize: 12, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 11 },
  inventory: {
    width: 104,
    alignItems: 'center',
    gap: 4,
    padding: space.sm,
    borderRadius: radius.small,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  inventoryTitle: { fontWeight: '800' },
  count: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
})
