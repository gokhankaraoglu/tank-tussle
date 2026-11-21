/** Provides the shared weapon registry. */
export const WEAPON_REGISTRY = Symbol('WEAPON_REGISTRY')

/** Provides `() => number` used to seed new matches. Tests inject a fixed seed. */
export const SEED_SOURCE = Symbol('SEED_SOURCE')
export type SeedSource = () => number
