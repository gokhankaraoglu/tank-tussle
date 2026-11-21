import type { Vec2 } from '../math/vector.js'
import type { Rng } from '../random/rng.js'
import type { PlayerIndex } from '../tank/tank.js'
import type { TerrainView } from '../terrain/terrain.js'

export type WeaponId = string

export interface ProjectileAppearance {
  readonly color: string
  readonly radius: number
}

/** A projectile in flight. Mutated by the simulator and by its behavior. */
export interface Projectile {
  readonly id: number
  x: number
  y: number
  vx: number
  vy: number
  /** Ticks since the projectile became active. */
  age: number
  alive: boolean
  readonly behavior: ProjectileBehavior
}

export type Impact =
  { readonly kind: 'terrain' } | { readonly kind: 'tank'; readonly player: PlayerIndex }

export type ImpactResult = 'destroy' | 'continue'

/** Everything a projectile behavior may do to the world during a shot. */
export interface SimulationContext {
  readonly terrain: TerrainView
  readonly rng: Rng
  readonly shooter: PlayerIndex
  tankCenter(player: PlayerIndex): Vec2
  /** Carves a crater and damages tanks in range. Returns the points the shooter earned. */
  explode(x: number, y: number, radius: number, damage: number): number
  addDirt(x: number, y: number, radius: number): void
  /** Carves terrain without dealing damage (tunnels, diggers). */
  dig(x: number, y: number, radius: number): void
  /** Scores against tanks in range without carving terrain (e.g. burying them in dirt). */
  award(x: number, y: number, radius: number, damage: number): void
  spawn(spec: ProjectileSpec): void
  /** Puts a tank at a new x position (teleports). It lands on whatever ground is there. */
  moveTank(player: PlayerIndex, x: number): void
  /** Pushes tanks within `range` of x away from it, up to `distance` pixels at the centre. */
  shove(x: number, range: number, distance: number): void
  /** Takes up to `points` from the opponent's score and gives them to the shooter. */
  steal(points: number): void
  /** Raises a solid wall of ground (not loose dirt) centred on x. */
  buildWall(x: number, halfWidth: number, height: number): void
  /** Records a notable moment (e.g. for sound effects). Has no effect on the simulation. */
  signal(kind: SignalKind, x: number, y: number): void
}

/** Moments a behavior can announce; presentation layers decide how to show or play them. */
export type SignalKind = 'bounce' | 'split' | 'build'

/**
 * Strategy that decides how a projectile flies and what happens when it hits something.
 * Implementations are created fresh for every shot, so they may keep per-projectile state.
 */
export interface ProjectileBehavior {
  readonly appearance: ProjectileAppearance
  /** Multiplier for gravity (0 = straight line). Defaults to 1. */
  readonly gravityScale?: number
  onTick?(projectile: Projectile, context: SimulationContext): void
  onImpact(projectile: Projectile, impact: Impact, context: SimulationContext): ImpactResult
}

export interface ProjectileSpec {
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly behavior: ProjectileBehavior
  /** Ticks to wait before the projectile appears. */
  readonly delayTicks?: number
}

export interface LaunchParams {
  readonly origin: Vec2
  /** Degrees, 0 = right, 90 = up. */
  readonly angle: number
  /** Muzzle speed in px/s. */
  readonly speed: number
  readonly rng: Rng
}

export interface WeaponDefinition {
  readonly id: WeaponId
  readonly name: string
  readonly description: string
  /** 1 (weak) – 5 (strong). Used by the CPU to choose weapons. */
  readonly rating: number
  /** Short labels for what makes the weapon special, shown as badges (e.g. "Homing"). */
  readonly traits: readonly string[]
  launch(params: LaunchParams): ProjectileSpec[]
}
