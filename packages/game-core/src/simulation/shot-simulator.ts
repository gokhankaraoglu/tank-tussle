import { PHYSICS, SCORING, TANK } from '../constants.js'
import { distance, type Vec2 } from '../math/vector.js'
import { createRng, type Rng } from '../random/rng.js'
import {
  clampTankX,
  opponentOf,
  PLAYER_INDICES,
  tankCenter,
  type PlayerIndex,
  type TankState,
} from '../tank/tank.js'
import { muzzle, tankPose, worldAngle } from '../tank/tank-pose.js'
import { Terrain } from '../terrain/terrain.js'
import type {
  Impact,
  Projectile,
  ProjectileSpec,
  SignalKind,
  SimulationContext,
} from '../weapons/types.js'
import { findHitTank, hitsTerrain, integrate, isOutOfWorld } from './physics.js'

import type { ProjectileFrame, ShotEvent, ShotResult, ShotSetup } from './shot-types.js'

export type { ProjectileFrame, ShotEvent, ShotInput, ShotResult, ShotSetup } from './shot-types.js'

interface PendingProjectile {
  readonly spec: ProjectileSpec
  readonly activateAt: number
  /** Fired from the barrel rather than spawned by another projectile. */
  readonly fromBarrel: boolean
}

/**
 * Runs a whole shot instantly and deterministically.
 * The same setup always produces the same result, so server and clients agree.
 */
export class ShotSimulator implements SimulationContext {
  readonly terrain: Terrain
  readonly rng: Rng
  readonly shooter: PlayerIndex

  private readonly tanks: [TankState, TankState]
  private readonly frames: ProjectileFrame[][] = []
  private readonly events: ShotEvent[] = []
  private readonly scoreDelta: [number, number] = [0, 0]
  private pending: PendingProjectile[] = []
  private active: Projectile[] = []
  private nextId = 0
  private tick = 0
  private terrainDirty = false

  private constructor(private readonly setup: ShotSetup) {
    this.terrain = Terrain.fromLayers(setup.terrain)
    this.rng = createRng(setup.seed)
    this.shooter = setup.shooter
    this.tanks = [setup.tanks[0], setup.tanks[1]]
  }

  static run(setup: ShotSetup): ShotResult {
    return new ShotSimulator(setup).simulate()
  }

  tankCenter(player: PlayerIndex): Vec2 {
    return tankCenter(this.tanks[player], this.terrain)
  }

  explode(x: number, y: number, radius: number, damage: number): number {
    const earned = this.applyDamage(x, y, radius, damage)
    this.terrain.carveCircle(x, y, radius)
    this.terrainDirty = true
    this.events.push({ kind: 'explosion', tick: this.tick, x, y, radius })
    return earned
  }

  moveTank(player: PlayerIndex, x: number): void {
    const target = clampTankX(x)
    if (target === this.tanks[player].x) return
    this.tanks[player] = { ...this.tanks[player], x: target }
    this.events.push({ kind: 'tank-moved', tick: this.tick, player, x: target })
  }

  shove(x: number, range: number, distance: number): void {
    for (const player of PLAYER_INDICES) {
      const offset = this.tanks[player].x - x
      if (Math.abs(offset) >= range) continue
      const push = distance * (1 - Math.abs(offset) / range)
      this.moveTank(player, this.tanks[player].x + (offset < 0 ? -push : push))
    }
  }

  steal(points: number): void {
    const victim = opponentOf(this.shooter)
    const available = this.tanks[victim].score + this.scoreDelta[victim]
    const taken = Math.min(Math.round(points), Math.max(0, available))
    if (taken <= 0) return
    this.scoreDelta[victim] -= taken
    this.scoreDelta[this.shooter] += taken
    const center = this.tankCenter(victim)
    this.events.push({
      kind: 'steal',
      tick: this.tick,
      victim,
      scorer: this.shooter,
      points: taken,
      x: center.x,
      y: center.y,
    })
  }

  buildWall(x: number, halfWidth: number, height: number): void {
    this.terrain.raiseGround(x, halfWidth, height)
    this.terrainDirty = true
  }

  addDirt(x: number, y: number, radius: number): void {
    this.terrain.addCircle(x, y, radius)
    this.terrainDirty = true
    this.events.push({ kind: 'dirt', tick: this.tick, x, y, radius })
  }

  award(x: number, y: number, radius: number, damage: number): void {
    this.applyDamage(x, y, radius, damage)
  }

  dig(x: number, y: number, radius: number): void {
    this.terrain.carveCircle(x, y, radius)
    this.terrainDirty = true
  }

  spawn(spec: ProjectileSpec): void {
    this.pending.push({
      spec,
      activateAt: this.tick + 1 + (spec.delayTicks ?? 0),
      fromBarrel: false,
    })
  }

  signal(signal: SignalKind, x: number, y: number): void {
    this.events.push({ kind: 'signal', signal, tick: this.tick, x, y })
  }

  private simulate(): ShotResult {
    this.launch()

    for (this.tick = 0; this.tick < PHYSICS.maxTicks; this.tick++) {
      this.activatePending()
      if (this.active.length === 0 && this.pending.length === 0) break

      for (const projectile of this.active) this.step(projectile)
      this.active = this.active.filter((projectile) => projectile.alive)

      this.recordFrame()
    }

    return {
      frames: this.frames,
      events: this.events,
      terrain: this.terrain.toLayers(),
      scoreDelta: this.scoreDelta,
      tankX: [this.tanks[0].x, this.tanks[1].x],
      ticks: this.frames.length,
    }
  }

  private launch(): void {
    const { input, weapon } = this.setup
    // The barrel leans with the hull, so the shell leaves at the hull tilt plus the elevation.
    const pose = tankPose(this.tanks[this.shooter], this.terrain)
    const angle = worldAngle(pose, input.angle)
    const specs = weapon.launch({
      origin: muzzle(pose, angle),
      angle,
      speed: input.power * PHYSICS.powerToSpeed,
      rng: this.rng,
    })
    this.pending = specs.map((spec) => ({
      spec,
      activateAt: spec.delayTicks ?? 0,
      fromBarrel: true,
    }))
  }

  private activatePending(): void {
    const ready = this.pending.filter((entry) => entry.activateAt <= this.tick)
    if (ready.length === 0) return
    this.pending = this.pending.filter((entry) => entry.activateAt > this.tick)
    for (const { spec, fromBarrel } of ready) {
      if (fromBarrel) this.events.push({ kind: 'launch', tick: this.tick, x: spec.x, y: spec.y })
      this.active.push({
        id: this.nextId++,
        x: spec.x,
        y: spec.y,
        vx: spec.vx,
        vy: spec.vy,
        age: 0,
        alive: true,
        behavior: spec.behavior,
      })
    }
  }

  private step(projectile: Projectile): void {
    projectile.behavior.onTick?.(projectile, this)
    const gravityScale = projectile.behavior.gravityScale ?? 1

    for (let substep = 0; substep < PHYSICS.substeps && projectile.alive; substep++) {
      integrate(projectile, gravityScale)

      if (isOutOfWorld(projectile)) {
        projectile.alive = false
        break
      }

      const impact = this.detectImpact(projectile)
      if (!impact) continue

      // Behaviors see terrain impacts on the surface (so blasts are centred there). A projectile
      // that carries on unmoved (e.g. piercing rounds) gets its real position back.
      const trueY = projectile.y
      const surfaceY =
        impact.kind === 'terrain' ? Math.min(trueY, this.terrain.surfaceY(projectile.x)) : trueY
      projectile.y = surfaceY
      const result = projectile.behavior.onImpact(projectile, impact, this)
      if (result === 'continue' && projectile.y === surfaceY) projectile.y = trueY
      if (result === 'destroy') {
        projectile.alive = false
      }
    }
    projectile.age++
  }

  private detectImpact(projectile: Projectile): Impact | null {
    const centers: [Vec2, Vec2] = [this.tankCenter(0), this.tankCenter(1)]
    const ignore = projectile.age < PHYSICS.selfHitGraceTicks ? this.shooter : null
    const player = findHitTank(projectile, centers, ignore)
    if (player !== null) return { kind: 'tank', player }
    return hitsTerrain(projectile, this.terrain) ? { kind: 'terrain' } : null
  }

  private recordFrame(): void {
    if (this.terrainDirty) {
      this.events.push({ kind: 'terrain', tick: this.tick, terrain: this.terrain.toLayers() })
      this.terrainDirty = false
    }
    this.frames.push(
      this.active.map((projectile) => ({
        id: projectile.id,
        x: projectile.x,
        y: projectile.y,
        color: projectile.behavior.appearance.color,
        radius: projectile.behavior.appearance.radius,
      })),
    )
  }

  /** Scores every tank inside the blast. Hitting yourself scores for the opponent. */
  private applyDamage(x: number, y: number, radius: number, damage: number): number {
    let earned = 0
    if (damage <= 0) return earned
    for (const victim of PLAYER_INDICES) {
      const center = this.tankCenter(victim)
      const gap = distance({ x, y }, center)
      const hit = scoreHit(gap, radius, damage)
      if (!hit) continue

      const scorer = victim === this.shooter ? opponentOf(this.shooter) : this.shooter
      this.scoreDelta[scorer] += hit.points
      if (scorer === this.shooter) earned += hit.points
      this.events.push({
        kind: 'damage',
        tick: this.tick,
        victim,
        scorer,
        ...hit,
        x: center.x,
        y: center.y,
      })
    }
    return earned
  }
}

/** Points for a blast `gap` pixels from a tank, or null when the tank is out of reach. */
export const scoreHit = (
  gap: number,
  radius: number,
  damage: number,
): { readonly points: number; readonly direct: boolean } | null => {
  const reach = radius + TANK.radius
  if (gap >= reach) return null
  const closeness = 1 - gap / reach
  const direct = gap <= TANK.radius
  const bonus = direct ? 1 + SCORING.directHitBonus : 1
  return { points: Math.max(1, Math.round(damage * closeness ** SCORING.falloff * bonus)), direct }
}

export const simulateShot = (setup: ShotSetup): ShotResult => ShotSimulator.run(setup)
