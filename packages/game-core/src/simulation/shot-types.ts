import type { PlayerIndex, TankState } from '../tank/tank.js'
import type { TerrainLayers } from '../terrain/terrain.js'
import type { SignalKind, WeaponDefinition, WeaponId } from '../weapons/types.js'

export interface ShotInput {
  readonly angle: number
  readonly power: number
  readonly weaponId: WeaponId
}

export interface ProjectileFrame {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly color: string
  readonly radius: number
}

export type ShotEvent =
  | {
      readonly kind: 'explosion'
      readonly tick: number
      readonly x: number
      readonly y: number
      readonly radius: number
    }
  | { readonly kind: 'terrain'; readonly tick: number; readonly terrain: TerrainLayers }
  /** A projectile left the barrel (several for burst weapons). */
  | { readonly kind: 'launch'; readonly tick: number; readonly x: number; readonly y: number }
  | {
      readonly kind: 'dirt'
      readonly tick: number
      readonly x: number
      readonly y: number
      readonly radius: number
    }
  /** A tank was teleported or pushed to a new x position. */
  | {
      readonly kind: 'tank-moved'
      readonly tick: number
      readonly player: PlayerIndex
      readonly x: number
    }
  /** Points taken from `victim` and given to `scorer`. */
  | {
      readonly kind: 'steal'
      readonly tick: number
      readonly victim: PlayerIndex
      readonly scorer: PlayerIndex
      readonly points: number
      readonly x: number
      readonly y: number
    }
  | {
      readonly kind: 'signal'
      readonly signal: SignalKind
      readonly tick: number
      readonly x: number
      readonly y: number
    }
  | {
      readonly kind: 'damage'
      readonly tick: number
      readonly victim: PlayerIndex
      readonly scorer: PlayerIndex
      readonly points: number
      /** The blast was centred on the tank itself. */
      readonly direct: boolean
      readonly x: number
      readonly y: number
    }

/** Everything needed to replay a shot: per-tick projectile frames plus world events. */
export interface ShotResult {
  readonly frames: ProjectileFrame[][]
  readonly events: ShotEvent[]
  readonly terrain: TerrainLayers
  readonly scoreDelta: readonly [number, number]
  /** Where each tank stands after the shot (weapons can teleport or push tanks). */
  readonly tankX: readonly [number, number]
  readonly ticks: number
}

export interface ShotSetup {
  readonly terrain: TerrainLayers
  readonly tanks: readonly [TankState, TankState]
  readonly shooter: PlayerIndex
  readonly input: ShotInput
  readonly weapon: WeaponDefinition
  readonly seed: number
}
