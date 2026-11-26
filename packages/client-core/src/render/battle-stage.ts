import {
  Terrain,
  type PlayerIndex,
  type ShotEvent,
  type TankState,
  type TerrainLayers,
  type WeaponId,
} from '@tank-tussle/game-core'
import type { SessionSnapshot } from '../session/game-session.js'
import type { RenderScene } from './render-scene.js'
import { ShotPlayback } from './shot-playback.js'
import { TankMotion } from './tank-motion.js'

export interface StageView {
  readonly snapshot: SessionSnapshot
  /** Local player who may aim on the battlefield right now, or null. */
  readonly aimingPlayer: PlayerIndex | null
  /** True while the player is dragging on the battlefield to aim. */
  readonly dragging: boolean
}

export interface StageListener {
  /** Called once for each batch of shot events as playback reaches them. */
  onShotEvents?(events: ShotEvent[], weaponId: WeaponId): void
  onShotFinished(): void
}

interface ActivePlayback {
  readonly playback: ShotPlayback
  readonly startedAt: number
  /** Last tick whose events were reported. */
  lastTick: number
}

/**
 * Turns the session snapshot into the scene to draw for a moment in time: the resting
 * battlefield, or a frame of the pending shot's replay. Platform views call `frame` from their
 * animation loop and hand the result to a SceneRenderer.
 */
export class BattleStage {
  private active: ActivePlayback | null = null
  /** A shot whose replay ended; the snapshot may still carry it for a frame or two. */
  private finishedShot: number | null = null
  private readonly motion = new TankMotion()
  private terrainView: { layers: TerrainLayers; view: Terrain } | null = null

  constructor(private readonly startedAt: number) {}

  frame(view: StageView, now: number, listener: StageListener): RenderScene {
    const { snapshot, aimingPlayer, dragging } = view
    const { state, pendingShot } = snapshot
    const canAim = aimingPlayer !== null && !pendingShot
    const active = this.playbackFor(snapshot, now)
    // Moves are animated as a drive; during a shot playback positions follow the replay.
    const motion = this.motion.frame(state, this.viewOf(state.terrain), now, active === null)
    const base: RenderScene = {
      terrain: state.terrain,
      tanks: withX(state.tanks, motion.x),
      activePlayer: state.phase === 'playing' && !pendingShot ? state.turn : null,
      aimGuide: canAim && aimingPlayer !== null ? { player: aimingPlayer, dragging } : null,
      projectiles: [],
      trails: [],
      explosions: [],
      dustClouds: motion.dust,
      muzzleFlashes: [],
      recoil: [0, 0],
      motion: motion.looks,
      popups: [],
      time: (now - this.startedAt) / 1000,
    }

    if (!active) return base

    const tick = active.playback.tickAt((now - active.startedAt) / 1000)
    const events = active.playback.eventsBetween(active.lastTick, tick)
    active.lastTick = tick
    if (events.length > 0) listener.onShotEvents?.(events, active.playback.weaponId)
    if (active.playback.isFinished(tick)) {
      this.finishedShot = active.playback.id
      this.active = null
      listener.onShotFinished()
      return base
    }
    const { tankX, ...frame } = active.playback.frameAt(tick)
    const tanks = state.tanks.map((tank, index) => ({ ...tank, x: tankX[index] ?? tank.x }))
    return { ...base, ...frame, tanks: tanks as unknown as RenderScene['tanks'] }
  }

  private viewOf(layers: TerrainLayers): Terrain {
    if (this.terrainView?.layers !== layers) {
      this.terrainView = { layers, view: Terrain.fromLayers(layers) }
    }
    return this.terrainView.view
  }

  private playbackFor(snapshot: SessionSnapshot, now: number): ActivePlayback | null {
    const { pendingShot, state } = snapshot
    if (!pendingShot) {
      this.active = null
      this.finishedShot = null
      return null
    }
    if (pendingShot.id === this.finishedShot) return null
    if (this.active?.playback.id !== pendingShot.id) {
      const colors = [state.tanks[0].color, state.tanks[1].color] as const
      const startX = [state.tanks[0].x, state.tanks[1].x] as const
      this.active = {
        playback: new ShotPlayback(pendingShot, state.terrain, colors, startX),
        startedAt: now,
        lastTick: -1,
      }
    }
    return this.active
  }
}

const withX = (
  tanks: readonly [TankState, TankState],
  x: readonly [number, number],
): readonly [TankState, TankState] =>
  tanks[0].x === x[0] && tanks[1].x === x[1]
    ? tanks
    : [
        { ...tanks[0], x: x[0] },
        { ...tanks[1], x: x[1] },
      ]
