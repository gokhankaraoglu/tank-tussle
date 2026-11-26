import {
  drive,
  TANK,
  type DriveStop,
  type MatchState,
  type PlayerIndex,
  type TankState,
  type TerrainView,
} from '@tank-tussle/game-core'
import type { DustCloud } from './render-scene.js'

/** How a tank looks while (or after) driving, on top of its resting pose. */
export interface TankMotionLook {
  /** Signed distance the tracks have rolled so far (+ right); turns wheels and track links. */
  readonly rolled: number
  /** Small up-down bounce of the hull while the engine works, in pixels. */
  readonly bob: number
}

export interface MotionFrame {
  readonly x: readonly [number, number]
  readonly looks: readonly [TankMotionLook, TankMotionLook]
  readonly dust: readonly DustCloud[]
}

interface Glide {
  readonly from: number
  readonly to: number
  readonly direction: -1 | 1
  readonly startedAt: number
  readonly duration: number
  /** Set when the tank stopped at an obstacle: it jolts against it at the end. */
  readonly stoppedBy: DriveStop | null
}

interface Puff {
  readonly x: number
  readonly y: number
  readonly bornAt: number
}

/** Seconds per pixel, plus a little time to get going and to brake. */
const SECONDS_PER_PIXEL = 1 / 60
const START_AND_STOP = 0.25
const JOLT_SECONDS = 0.22
const JOLT_PIXELS = 1.8
const PUFF_EVERY = 0.07
const PUFF_LIFETIME = 0.6
const BOB_PIXELS = 0.6

/** Speeds up, cruises, slows down: tanks do not start or stop instantly. */
const easeInOut = (t: number): number => 0.5 - Math.cos(Math.PI * t) / 2

/**
 * Turns the instant position change of a move into a drive: the tank glides to its new spot
 * following the ground (its pose is computed from the animated x, so it tilts over bumps),
 * wheels and tracks roll, the hull bounces, dust trails behind, and a tank stopped by a wall
 * jolts against it. Shots and teleports are not moves and are shown without a drive.
 */
export class TankMotion {
  private shown: [number | null, number | null] = [null, null]
  private movesLeft: [number, number] = [0, 0]
  private rolled: [number, number] = [0, 0]
  private glides: [Glide | null, Glide | null] = [null, null]
  private puffs: Puff[] = []
  private lastPuff: [number, number] = [0, 0]

  /** `animate`: false while a shot plays back; positions then simply follow the state. */
  frame(state: MatchState, terrain: TerrainView, now: number, animate: boolean): MotionFrame {
    const players: readonly PlayerIndex[] = [0, 1]
    const x = players.map((player) =>
      this.track(player, state.tanks[player], terrain, now, animate),
    ) as unknown as [number, number]
    this.puffs = this.puffs.filter((puff) => now - puff.bornAt < PUFF_LIFETIME * 1000)
    return {
      x,
      looks: [this.look(0, now), this.look(1, now)],
      dust: this.puffs.map((puff) => ({
        x: puff.x,
        y: puff.y,
        radius: 7,
        progress: (now - puff.bornAt) / (PUFF_LIFETIME * 1000),
      })),
    }
  }

  private track(
    player: PlayerIndex,
    tank: TankState,
    terrain: TerrainView,
    now: number,
    animate: boolean,
  ): number {
    const shown = this.shown[player]
    const moved = tank.movesLeft < this.movesLeft[player]
    this.movesLeft[player] = tank.movesLeft
    if (shown === null || !animate) return this.settle(player, tank.x)
    if (moved && tank.x !== shown) this.startGlide(player, shown, tank.x, terrain, now)

    const glide = this.glides[player]
    if (!glide) return this.settle(player, tank.x)
    const elapsed = (now - glide.startedAt) / 1000
    if (elapsed >= glide.duration + (glide.stoppedBy ? JOLT_SECONDS : 0)) {
      this.glides[player] = null
      return this.settle(player, tank.x)
    }

    const progress = Math.min(1, elapsed / glide.duration)
    const position = glide.from + (glide.to - glide.from) * easeInOut(progress)
    const jolt = elapsed > glide.duration ? this.jolt(glide, elapsed - glide.duration) : 0
    this.rolled[player] += position - (this.shown[player] ?? position)
    this.shown[player] = position
    if (progress < 1) this.kickUpDust(player, position, glide.direction, terrain, now)
    return position + jolt
  }

  private startGlide(
    player: PlayerIndex,
    from: number,
    to: number,
    terrain: TerrainView,
    now: number,
  ): void {
    const direction = to > from ? 1 : -1
    // Re-drive the same route to learn whether a wall ended it (the engine is deterministic).
    const { stoppedBy } = drive(from, direction, TANK.moveDistance, terrain)
    this.glides[player] = {
      from,
      to,
      direction,
      startedAt: now,
      duration: START_AND_STOP + Math.abs(to - from) * SECONDS_PER_PIXEL,
      stoppedBy: stoppedBy === 'edge' ? null : stoppedBy,
    }
  }

  /** Bumps forward into the obstacle and settles back. */
  private jolt(glide: Glide, seconds: number): number {
    const t = Math.min(1, seconds / JOLT_SECONDS)
    return glide.direction * JOLT_PIXELS * Math.sin(Math.PI * t) * (1 - t)
  }

  private kickUpDust(
    player: PlayerIndex,
    x: number,
    direction: -1 | 1,
    terrain: TerrainView,
    now: number,
  ): void {
    if (now - this.lastPuff[player] < PUFF_EVERY * 1000) return
    this.lastPuff[player] = now
    const rear = x - direction * (TANK.halfTrack + 2)
    this.puffs.push({ x: rear, y: terrain.surfaceY(rear) - 2, bornAt: now })
  }

  private look(player: PlayerIndex, now: number): TankMotionLook {
    const driving = this.glides[player] !== null
    return {
      rolled: this.rolled[player],
      bob: driving ? Math.sin(now / 22) * BOB_PIXELS : 0,
    }
  }

  private settle(player: PlayerIndex, x: number): number {
    this.shown[player] = x
    return x
  }
}
