import type { PlayerIndex, TankState } from '../tank/tank.js'
import type { TerrainLayers } from '../terrain/terrain.js'
import type { WeaponId } from '../weapons/types.js'

export type MatchMode = 'versus' | 'practice'
export type MatchPhase = 'shop' | 'playing' | 'over'
export type MatchResult = PlayerIndex | 'draw'

export interface PlayerProfile {
  readonly name: string
  readonly color: string
}

export interface MatchConfig {
  readonly mode: MatchMode
  readonly players: readonly [PlayerProfile, PlayerProfile]
  readonly seed: number
  readonly weaponsPerPlayer: number
  readonly shopSize: number
}

export interface ShopState {
  /** Every weapon offered in this draft, in display order. Duplicates are allowed. */
  readonly pool: readonly WeaponId[]
  /** Who took each pool slot, or null while it is still available. */
  readonly takenBy: readonly (PlayerIndex | null)[]
  readonly picker: PlayerIndex
  /** Players whose remaining picks are made at random as soon as it is their turn. */
  readonly autoPickers: readonly PlayerIndex[]
}

/** Plain, serialisable snapshot of a match. Safe to send over the network. */
export interface MatchState {
  readonly config: MatchConfig
  readonly phase: MatchPhase
  readonly terrain: TerrainLayers
  readonly tanks: readonly [TankState, TankState]
  /** Weapons each player still holds. */
  readonly inventories: readonly [readonly WeaponId[], readonly WeaponId[]]
  /** Weapons each player has already fired, oldest first. */
  readonly spent: readonly [readonly WeaponId[], readonly WeaponId[]]
  readonly shop: ShopState
  /** Consecutive scoring shots per player; drives the combo multiplier. */
  readonly streaks: readonly [number, number]
  readonly turn: PlayerIndex
  readonly shotCount: number
  readonly result: MatchResult | null
}

export interface FireCommand {
  readonly angle: number
  readonly power: number
  /** Index into the shooter's inventory. */
  readonly slot: number
}

export type MoveDirection = -1 | 1
