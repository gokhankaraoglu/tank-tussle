import type { PlayerIndex, ShopState, WeaponId } from '@tank-tussle/game-core'

/** One card in the weapon shop: every copy of a weapon in the pool. */
export interface ShopEntry {
  readonly id: WeaponId
  readonly total: number
  readonly available: number
  /** Pool slot to pick for this weapon, or null when every copy is taken. */
  readonly nextSlot: number | null
  /** Copies each player has taken. */
  readonly takenBy: readonly [number, number]
}

interface WeaponFacts {
  readonly name: string
  readonly rating: number
}

/**
 * The shop pool as the player should see it: one entry per weapon, weapons still on offer first
 * (strongest first, then by name), sold-out ones last. The order never depends on draft order,
 * so a weapon does not jump around between picks.
 */
export const buildShopCatalog = (
  shop: Pick<ShopState, 'pool' | 'takenBy'>,
  weapon: (id: WeaponId) => WeaponFacts,
): ShopEntry[] => {
  const entries = new Map<
    WeaponId,
    { total: number; available: number; nextSlot: number | null; takenBy: [number, number] }
  >()
  shop.pool.forEach((id, slot) => {
    const entry = entries.get(id) ?? { total: 0, available: 0, nextSlot: null, takenBy: [0, 0] }
    entries.set(id, entry)
    entry.total++
    const owner: PlayerIndex | null = shop.takenBy[slot] ?? null
    if (owner === null) {
      entry.available++
      entry.nextSlot ??= slot
    } else {
      entry.takenBy[owner]++
    }
  })
  return [...entries]
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => {
      const soldOut = Number(a.available === 0) - Number(b.available === 0)
      if (soldOut !== 0) return soldOut
      const left = weapon(a.id)
      const right = weapon(b.id)
      return right.rating - left.rating || left.name.localeCompare(right.name)
    })
}
