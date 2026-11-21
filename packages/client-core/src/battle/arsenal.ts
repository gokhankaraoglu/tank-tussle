import type { WeaponId } from '@tank-tussle/game-core'

/** One row of the weapon list: every copy of a weapon a player drafted. */
export interface ArsenalEntry {
  readonly id: WeaponId
  readonly remaining: number
  readonly used: number
  /** Inventory slot to fire next, or null when every copy has been used. */
  readonly nextSlot: number | null
}

/** Groups held and fired weapons, in draft order, so the list never reshuffles mid-match. */
export const buildArsenal = (
  inventory: readonly WeaponId[],
  spent: readonly WeaponId[],
): ArsenalEntry[] => {
  const entries = new Map<WeaponId, { remaining: number; used: number; nextSlot: number | null }>()
  const entry = (id: WeaponId) => {
    const existing = entries.get(id) ?? { remaining: 0, used: 0, nextSlot: null }
    entries.set(id, existing)
    return existing
  }
  spent.forEach((id) => entry(id).used++)
  inventory.forEach((id, slot) => {
    const current = entry(id)
    current.remaining++
    current.nextSlot ??= slot
  })
  return [...entries].map(([id, counts]) => ({ id, ...counts }))
}
