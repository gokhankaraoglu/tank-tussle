import { STANDARD_WEAPONS } from './standard/index.js'
import type { WeaponDefinition, WeaponId } from './types.js'

/** Looks weapons up by id. Packs are plain arrays, so new packs need no code changes here. */
export class WeaponRegistry {
  private readonly weapons: ReadonlyMap<WeaponId, WeaponDefinition>

  constructor(definitions: readonly WeaponDefinition[]) {
    const weapons = new Map<WeaponId, WeaponDefinition>()
    for (const definition of definitions) {
      if (weapons.has(definition.id)) throw new Error(`Duplicate weapon id: ${definition.id}`)
      weapons.set(definition.id, definition)
    }
    this.weapons = weapons
  }

  has(id: WeaponId): boolean {
    return this.weapons.has(id)
  }

  get(id: WeaponId): WeaponDefinition {
    const weapon = this.weapons.get(id)
    if (!weapon) throw new Error(`Unknown weapon: ${id}`)
    return weapon
  }

  all(): WeaponDefinition[] {
    return [...this.weapons.values()]
  }

  ids(): WeaponId[] {
    return [...this.weapons.keys()]
  }
}

export const createDefaultWeaponRegistry = (): WeaponRegistry =>
  new WeaponRegistry(STANDARD_WEAPONS)
