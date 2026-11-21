import { PHYSICS, type ShotEvent, type TerrainLayers, type WeaponId } from '@tank-tussle/game-core'
import type { PendingShot } from '../session/game-session.js'
import type { DustCloud, ExplosionSprite, MuzzleFlash, ScorePopup, Trail } from './render-scene.js'

const EXPLOSION_TICKS = 24
const DUST_TICKS = 36
const FLASH_TICKS = 7
const RECOIL_TICKS = 16
const POPUP_TICKS = 60
const TRAIL_TICKS = 14
/** Keep animating after the last projectile so explosions can finish. */
const LINGER_TICKS = 40

type EventOf<K extends ShotEvent['kind']> = Extract<ShotEvent, { kind: K }>

export interface PlaybackFrame {
  readonly terrain: TerrainLayers
  readonly projectiles: PendingShot['result']['frames'][number]
  readonly trails: Trail[]
  readonly explosions: ExplosionSprite[]
  readonly dustClouds: DustCloud[]
  readonly muzzleFlashes: MuzzleFlash[]
  readonly recoil: [number, number]
  readonly popups: ScorePopup[]
  /** Tank positions at this tick: weapons can teleport or shove tanks mid-shot. */
  readonly tankX: [number, number]
}

/** Turns a pre-computed shot into frames for any point in time. Stateless apart from its input. */
export class ShotPlayback {
  private readonly terrainEvents: EventOf<'terrain'>[]
  private readonly explosionEvents: EventOf<'explosion'>[]
  private readonly dirtEvents: EventOf<'dirt'>[]
  private readonly launchEvents: EventOf<'launch'>[]
  private readonly damageEvents: EventOf<'damage'>[]
  private readonly stealEvents: EventOf<'steal'>[]
  private readonly moveEvents: EventOf<'tank-moved'>[]

  constructor(
    private readonly shot: PendingShot,
    private readonly initialTerrain: TerrainLayers,
    private readonly playerColors: readonly [string, string],
    /** Where the tanks stood before the shot. */
    private readonly startX: readonly [number, number],
  ) {
    const { events } = shot.result
    this.terrainEvents = events.filter(
      (event): event is EventOf<'terrain'> => event.kind === 'terrain',
    )
    this.dirtEvents = events.filter((event): event is EventOf<'dirt'> => event.kind === 'dirt')
    this.launchEvents = events.filter(
      (event): event is EventOf<'launch'> => event.kind === 'launch',
    )
    this.explosionEvents = events.filter(
      (event): event is EventOf<'explosion'> => event.kind === 'explosion',
    )
    this.damageEvents = events.filter(
      (event): event is EventOf<'damage'> => event.kind === 'damage',
    )
    this.stealEvents = events.filter((event): event is EventOf<'steal'> => event.kind === 'steal')
    this.moveEvents = events.filter(
      (event): event is EventOf<'tank-moved'> => event.kind === 'tank-moved',
    )
  }

  get id(): number {
    return this.shot.id
  }

  tickAt(elapsedSeconds: number): number {
    return Math.floor(elapsedSeconds * PHYSICS.tickRate)
  }

  get weaponId(): WeaponId {
    return this.shot.input.weaponId
  }

  /** Events after `fromTick`, up to and including `toTick` — for one-off effects like sound. */
  eventsBetween(fromTick: number, toTick: number): ShotEvent[] {
    return this.shot.result.events.filter((event) => event.tick > fromTick && event.tick <= toTick)
  }

  isFinished(tick: number): boolean {
    return tick >= this.shot.result.ticks + LINGER_TICKS
  }

  frameAt(tick: number): PlaybackFrame {
    return {
      terrain: this.terrainAt(tick),
      projectiles: this.shot.result.frames[tick] ?? [],
      trails: this.trailsAt(tick),
      explosions: this.explosionsAt(tick),
      dustClouds: this.dustAt(tick),
      muzzleFlashes: this.flashesAt(tick),
      recoil: this.recoilAt(tick),
      popups: this.popupsAt(tick),
      tankX: this.tankXAt(tick),
    }
  }

  private terrainAt(tick: number): TerrainLayers {
    let terrain = this.initialTerrain
    for (const event of this.terrainEvents) {
      if (event.tick > tick) break
      terrain = event.terrain
    }
    return terrain
  }

  private trailsAt(tick: number): Trail[] {
    const trails = new Map<number, { color: string; points: { x: number; y: number }[] }>()
    const frames = this.shot.result.frames
    for (
      let index = Math.max(0, tick - TRAIL_TICKS);
      index <= Math.min(tick, frames.length - 1);
      index++
    ) {
      for (const projectile of frames[index] ?? []) {
        const trail = trails.get(projectile.id) ?? { color: projectile.color, points: [] }
        trail.points.push({ x: projectile.x, y: projectile.y })
        trails.set(projectile.id, trail)
      }
    }
    return [...trails.values()]
  }

  private flashesAt(tick: number): MuzzleFlash[] {
    return this.launchEvents
      .filter((event) => tick >= event.tick && tick - event.tick < FLASH_TICKS)
      .map((event) => ({ x: event.x, y: event.y, progress: (tick - event.tick) / FLASH_TICKS }))
  }

  /** The barrel kicks back on every launch and eases forward again. */
  private recoilAt(tick: number): [number, number] {
    const kick = this.launchEvents
      .filter((event) => tick >= event.tick && tick - event.tick < RECOIL_TICKS)
      .reduce((max, event) => Math.max(max, 1 - (tick - event.tick) / RECOIL_TICKS), 0)
    const recoil: [number, number] = [0, 0]
    recoil[this.shot.player] = kick
    return recoil
  }

  private dustAt(tick: number): DustCloud[] {
    return this.dirtEvents
      .filter((event) => tick >= event.tick && tick - event.tick < DUST_TICKS)
      .map((event) => ({ ...event, progress: (tick - event.tick) / DUST_TICKS }))
  }

  private explosionsAt(tick: number): ExplosionSprite[] {
    return this.explosionEvents
      .filter((event) => tick >= event.tick && tick - event.tick < EXPLOSION_TICKS)
      .map((event) => ({ ...event, progress: (tick - event.tick) / EXPLOSION_TICKS }))
  }

  private popupsAt(tick: number): ScorePopup[] {
    const visible = <E extends { tick: number }>(events: readonly E[]) =>
      events.filter((event) => tick >= event.tick && tick - event.tick < POPUP_TICKS)
    const gains = visible(this.damageEvents).map((event) => ({
      x: event.x,
      y: event.y - 24,
      text: event.direct ? `DIRECT HIT +${event.points}` : `+${event.points}`,
      color: this.playerColors[event.scorer],
      progress: (tick - event.tick) / POPUP_TICKS,
    }))
    const thefts = visible(this.stealEvents).map((event) => ({
      x: event.x,
      y: event.y - 48,
      text: `STOLEN −${event.points}`,
      color: this.playerColors[event.scorer],
      progress: (tick - event.tick) / POPUP_TICKS,
    }))
    return [...gains, ...thefts]
  }

  /** Each tank's x at `tick`: the start position, updated by every move event so far. */
  private tankXAt(tick: number): [number, number] {
    const positions: [number, number] = [this.startX[0], this.startX[1]]
    for (const event of this.moveEvents) {
      if (event.tick > tick) break
      positions[event.player] = event.x
    }
    return positions
  }
}
