import type { TankMotionLook } from './tank-motion.js'
import type {
  PlayerIndex,
  ProjectileFrame,
  TankState,
  TerrainLayers,
  Vec2,
} from '@tank-tussle/game-core'

export interface Trail {
  readonly color: string
  readonly points: readonly Vec2[]
}

export interface ExplosionSprite {
  readonly x: number
  readonly y: number
  readonly radius: number
  /** 0 → 1 over the animation. */
  readonly progress: number
}

/** Loose dirt landing: a brown puff instead of a fireball. */
export interface DustCloud {
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly progress: number
}

/** Flash at the muzzle just after a shell leaves the barrel. */
export interface MuzzleFlash {
  readonly x: number
  readonly y: number
  readonly progress: number
}

export interface ScorePopup {
  readonly x: number
  readonly y: number
  /** The number itself, e.g. `+42` or `−12`. */
  readonly points: string
  /** Small caption above the number (`DIRECT HIT`, `STOLEN`), or null. */
  readonly label: string | null
  readonly color: string
  readonly progress: number
}

/** Dashed line showing where the local player is aiming. */
export interface AimGuide {
  readonly player: PlayerIndex
  /** True while the player drags on the battlefield: also shows the numbers. */
  readonly dragging: boolean
}

/** Everything the renderer needs for one frame. Pure data, no game logic. */
export interface RenderScene {
  readonly terrain: TerrainLayers
  readonly tanks: readonly [TankState, TankState]
  readonly activePlayer: PlayerIndex | null
  readonly aimGuide: AimGuide | null
  readonly projectiles: readonly ProjectileFrame[]
  readonly trails: readonly Trail[]
  readonly explosions: readonly ExplosionSprite[]
  readonly dustClouds: readonly DustCloud[]
  readonly muzzleFlashes: readonly MuzzleFlash[]
  /** 0–1 barrel recoil per player. */
  readonly recoil: readonly [number, number]
  /** Rolling tracks and hull bounce per player, while (and after) driving. */
  readonly motion: readonly [TankMotionLook, TankMotionLook]
  readonly popups: readonly ScorePopup[]
  /** Seconds since the renderer started; drives idle animations. */
  readonly time: number
}
