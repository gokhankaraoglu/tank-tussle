import { buildArsenal, buildShopCatalog, type ShopEntry } from '@tank-tussle/client-core'
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
  /** Asks to leave the match (the caller confirms). */
  readonly onLeave: () => void
}

/** Copies of a weapon share one card, strongest first, sold-out weapons last. */
export const WeaponShop = ({
  state,
  registry,
  canPick,
  onPick,
  onDealAll,
  onLeave,
}: WeaponShopProps) => {
  const picker = state.tanks[state.shop.picker]
  const catalog = buildShopCatalog(state.shop, (id) => registry.get(id))
  const picked = state.inventories[0].length + state.inventories[1].length
  const totalPicks = state.config.weaponsPerPlayer * 2

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Button variant="ghost" onPress={onLeave} style={styles.leave}>
          ← Leave
        </Button>
        <View style={styles.heading}>
          <Text style={styles.title}>Weapon Shop</Text>
          <Text style={[styles.turn, { color: picker.color }]} accessibilityLiveRegion="polite">
            {canPick ? `${picker.name}, pick a weapon` : `Waiting for ${picker.name}…`}
            <Text style={styles.progress}>
              {' '}
              · pick {Math.min(picked + 1, totalPicks)} of {totalPicks}
            </Text>
          </Text>
        </View>
        <SoundToggles />
        <Button variant="primary" disabled={!canPick} onPress={onDealAll}>
          Random · deal all
        </Button>
      </View>

      <View style={styles.body}>
        <Inventory state={state} registry={registry} player={0} />
        <ScrollView contentContainerStyle={styles.pool}>
          {catalog.map((entry) => (
            <ShopCard
              key={entry.id}
              entry={entry}
              state={state}
              registry={registry}
              canPick={canPick}
              onPick={onPick}
            />
          ))}
        </ScrollView>
        <Inventory state={state} registry={registry} player={1} />
      </View>
    </SafeAreaView>
  )
}

interface ShopCardProps {
  readonly entry: ShopEntry
  readonly state: MatchState
  readonly registry: WeaponRegistry
  readonly canPick: boolean
  readonly onPick: (poolIndex: number) => void
}

const ShopCard = ({ entry, state, registry, canPick, onPick }: ShopCardProps) => {
  const click = useClickSound()
  const weapon = registry.get(entry.id)
  const soldOut = entry.nextSlot === null
  const picker = state.tanks[state.shop.picker]
  const owners = ([0, 1] as const).filter((player) => entry.takenBy[player] > 0)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${weapon.name}, ${soldOut ? 'sold out' : `${entry.available} left`}`}
      disabled={soldOut || !canPick}
      onPress={() => {
        if (entry.nextSlot === null) return
        click()
        onPick(entry.nextSlot)
      }}
      style={({ pressed }) => [
        styles.weapon,
        pressed && { borderColor: picker.color },
        soldOut && styles.soldOut,
      ]}
    >
      <View style={styles.weaponHead}>
        <WeaponIcon id={entry.id} size={34} />
        <View style={styles.weaponTitle}>
          <Text style={styles.weaponName} numberOfLines={1}>
            {weapon.name}
          </Text>
          <Text style={styles.rating}>
            {'★'.repeat(weapon.rating)}
            {'☆'.repeat(5 - weapon.rating)}
          </Text>
        </View>
        <Text style={[styles.count, soldOut && styles.countSoldOut]}>
          {soldOut ? 'Sold out' : `×${entry.available}`}
        </Text>
      </View>
      <WeaponTraits traits={weapon.traits} />
      <Text style={styles.description} numberOfLines={3}>
        {weapon.description}
      </Text>
      {owners.length > 0 && (
        <View style={styles.owners}>
          {owners.map((player) => (
            <Text key={player} style={[styles.owner, { color: state.tanks[player].color }]}>
              {state.tanks[player].name} ×{entry.takenBy[player]}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  )
}

interface InventoryProps {
  readonly state: MatchState
  readonly registry: WeaponRegistry
  readonly player: PlayerIndex
}

/** A player's picks so far, grouped by weapon, and how many picks are still to come. */
const Inventory = ({ state, registry, player }: InventoryProps) => {
  const tank = state.tanks[player]
  const items = state.inventories[player]
  const left = Math.max(0, state.config.weaponsPerPlayer - items.length)
  const picking = state.shop.picker === player
  return (
    <View style={[styles.inventory, picking && { borderColor: tank.color }]}>
      <Text style={[styles.inventoryTitle, { color: tank.color }]} numberOfLines={1}>
        {tank.name}
      </Text>
      <Text style={styles.muted}>
        {items.length}/{state.config.weaponsPerPlayer}
      </Text>
      <ScrollView contentContainerStyle={styles.items}>
        {buildArsenal(items, []).map(({ id, remaining }) => (
          <View key={id} style={styles.item}>
            <WeaponIcon id={id} size={20} />
            <Text style={styles.itemName} numberOfLines={1}>
              {registry.get(id).name}
            </Text>
            {remaining > 1 && (
              <Text style={[styles.itemCount, { color: tank.color }]}>×{remaining}</Text>
            )}
          </View>
        ))}
        {left > 0 && (
          <Text style={styles.muted}>
            {left} {left === 1 ? 'pick' : 'picks'} to go
          </Text>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  leave: { minHeight: 36, paddingHorizontal: space.md },
  heading: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  turn: { fontWeight: '700' },
  progress: { color: colors.muted, fontWeight: '600' },
  body: { flex: 1, flexDirection: 'row', gap: space.sm },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  weapon: {
    width: 176,
    gap: 4,
    padding: space.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  soldOut: { opacity: 0.5, backgroundColor: colors.background },
  weaponHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  weaponTitle: { flex: 1, minWidth: 0 },
  weaponName: { color: colors.text, fontWeight: '800' },
  rating: { color: colors.accent, fontSize: 11 },
  count: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  countSoldOut: { color: colors.muted, backgroundColor: 'transparent' },
  description: { color: colors.muted, fontSize: 11 },
  owners: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  owner: { fontSize: 11, fontWeight: '700' },
  inventory: {
    width: 120,
    gap: 4,
    padding: space.sm,
    borderRadius: radius.small,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  inventoryTitle: { fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  items: { gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemName: { flex: 1, color: colors.text, fontSize: 11 },
  itemCount: { fontSize: 11, fontWeight: '800' },
})
