import {
  muzzle,
  TANK,
  tankPose,
  worldAngle,
  type TankPose,
  type TankState,
  type TerrainView,
} from '@tank-tussle/game-core'
import type { Canvas2D } from './canvas-2d.js'
import { shade } from './color.js'
import { drawHalo } from './effects-painter.js'
import type { TankMotionLook } from './tank-motion.js'

export interface TankLook {
  /** 1 when the tank faces right (towards an enemy on its right), -1 when it faces left. */
  readonly facing: 1 | -1
  readonly active: boolean
  /** 0–1: how far the barrel is pushed back by the last shot. */
  readonly recoil: number
  readonly time: number
  /** Rolling tracks and hull bounce while driving. */
  readonly motion: TankMotionLook
}

const TRACK = '#22252f'
const TRACK_LINK = '#3a3f4e'
const WHEEL = '#9097ab'
const WHEEL_HUB = '#4b5062'
const ROAD_WHEELS = [-13, -6.5, 0, 6.5, 13] as const
const RECOIL_DISTANCE = 6
const LINK_SPACING = 3.2

/**
 * Draws a tank resting on the slope under it. Hull, tracks and turret lean with the ground; the
 * barrel is raised from the hull, so it leans too — exactly the geometry the engine fires from.
 * Coordinates inside the hull are local: origin between the track ends, y up is negative.
 */
export const drawTank = (
  ctx: Canvas2D,
  tank: TankState,
  terrain: TerrainView,
  look: TankLook,
): void => {
  const pose = tankPose(tank, terrain)
  const angle = worldAngle(pose, tank.angle)

  // The active tank glows; a gradient halo, not shadowBlur (see drawHalo).
  if (look.active) drawHalo(ctx, pose.center.x, pose.center.y, 8, 40, tank.color, 0.45)
  // Tracks roll with the ground; in the mirrored hull frame "forward" flips with the facing.
  const roll = look.motion.rolled * look.facing
  withHullFrame(ctx, pose, look.facing, () => {
    drawShadow(ctx)
    ctx.translate(0, look.motion.bob)
    drawHull(ctx, tank.color)
    ctx.translate(0, -look.motion.bob)
    drawTracks(ctx, roll)
  })
  drawBarrel(ctx, pose, angle, tank.color, look.recoil)
  withHullFrame(ctx, pose, look.facing, () => {
    ctx.translate(0, look.motion.bob)
    drawTurret(ctx, tank.color, look.time)
  })
  drawLabel(ctx, tank, pose, look)
}

/** Runs `draw` in hull coordinates: on the ground, rotated with the slope, mirrored to face. */
const withHullFrame = (ctx: Canvas2D, pose: TankPose, facing: 1 | -1, draw: () => void): void => {
  ctx.save()
  ctx.translate(pose.base.x, pose.base.y)
  ctx.rotate((-pose.tilt * Math.PI) / 180)
  ctx.scale(facing, 1)
  draw()
  ctx.restore()
}

const drawShadow = (ctx: Canvas2D): void => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  ctx.ellipse(0, 1.5, 25, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** `roll`: distance the tracks have travelled, in hull coordinates (+ = forward). */
const drawTracks = (ctx: Canvas2D, roll: number): void => {
  const half = TANK.halfTrack + 4
  ctx.fillStyle = TRACK
  ctx.beginPath()
  ctx.roundRect(-half, -10, half * 2, 10, 5)
  ctx.fill()

  // Track links: the bottom run stays on the ground while the hull drives over it, so relative
  // to the hull it moves backwards; the top run moves forwards.
  ctx.fillStyle = TRACK_LINK
  const offset = ((roll % LINK_SPACING) + LINK_SPACING) % LINK_SPACING
  for (let x = -half + 3 - offset; x < half - 2; x += LINK_SPACING) {
    if (x > -half + 1) ctx.fillRect(x, -1.6, 1.6, 1.6)
  }
  for (let x = -half + 3 + offset - LINK_SPACING; x < half - 2; x += LINK_SPACING) {
    if (x > -half + 1) ctx.fillRect(x, -10, 1.6, 1.4)
  }

  // Drive sprocket and idler at the ends, road wheels between them.
  for (const x of [-half + 5, half - 5]) drawWheel(ctx, x, -5, 4, roll)
  for (const x of ROAD_WHEELS) drawWheel(ctx, x, -4, 3, roll)
}

/** A wheel with a notch on its hub, so it can be seen turning as the tank drives. */
const drawWheel = (ctx: Canvas2D, x: number, y: number, radius: number, roll: number): void => {
  ctx.fillStyle = WHEEL
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = WHEEL_HUB
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2)
  ctx.fill()
  const turn = roll / radius
  ctx.fillRect(
    x + Math.cos(turn) * radius * 0.65 - 0.6,
    y + Math.sin(turn) * radius * 0.65 - 0.6,
    1.2,
    1.2,
  )
}

/** Front (+x) has a sloped glacis; a side skirt covers the top of the tracks. */
const drawHull = (ctx: Canvas2D, color: string): void => {
  const body = ctx.createLinearGradient(0, -19, 0, -9)
  body.addColorStop(0, shade(color, 0.2))
  body.addColorStop(1, shade(color, -0.4))
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(-23, -9)
  ctx.lineTo(24, -9)
  ctx.lineTo(17, -18)
  ctx.lineTo(-20, -18)
  ctx.lineTo(-23, -14)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = shade(color, -0.6)
  ctx.lineWidth = 0.8
  ctx.stroke()

  ctx.fillStyle = shade(color, -0.5)
  ctx.fillRect(-22, -11, 44, 3)
  // Camouflage patches.
  ctx.fillStyle = shade(color, -0.22)
  ctx.beginPath()
  ctx.ellipse(-9, -14.5, 6, 2, 0.2, 0, Math.PI * 2)
  ctx.ellipse(9, -13.5, 4, 1.6, -0.3, 0, Math.PI * 2)
  ctx.fill()
}

/** Angular turret with a commander's hatch and a whip antenna that sways a little. */
const drawTurret = (ctx: Canvas2D, color: string, time: number): void => {
  const pivotY = -TANK.pivotHeight
  const shell = ctx.createLinearGradient(0, pivotY - 7, 0, pivotY + 3)
  shell.addColorStop(0, shade(color, 0.35))
  shell.addColorStop(1, shade(color, -0.3))
  ctx.fillStyle = shell
  ctx.beginPath()
  ctx.moveTo(-14, -18)
  ctx.lineTo(9, -18)
  ctx.lineTo(12, pivotY - 1)
  ctx.lineTo(7, pivotY - 6)
  ctx.lineTo(-10, pivotY - 7)
  ctx.lineTo(-14, pivotY - 3)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = shade(color, -0.6)
  ctx.lineWidth = 0.8
  ctx.stroke()

  // Gun mantlet around the pivot.
  ctx.fillStyle = shade(color, -0.35)
  ctx.beginPath()
  ctx.arc(0, pivotY, 3.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = shade(color, -0.45)
  ctx.beginPath()
  ctx.ellipse(-5, pivotY - 7, 3.5, 1.4, 0, 0, Math.PI * 2)
  ctx.fill()

  const sway = Math.sin(time * 2.2) * 1.5
  ctx.strokeStyle = 'rgba(30, 30, 40, 0.9)'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.moveTo(-11, pivotY - 6)
  ctx.quadraticCurveTo(-11 - sway * 0.4, pivotY - 15, -12 - sway, pivotY - 22)
  ctx.stroke()
}

/** Drawn in world coordinates along the true firing direction, pushed back while recoiling. */
const drawBarrel = (
  ctx: Canvas2D,
  pose: TankPose,
  angle: number,
  color: string,
  recoil: number,
): void => {
  const radians = (angle * Math.PI) / 180
  const along = { x: Math.cos(radians), y: -Math.sin(radians) }
  const back = recoil * RECOIL_DISTANCE
  const start = { x: pose.pivot.x - along.x * back, y: pose.pivot.y - along.y * back }
  const tipPoint = muzzle(pose, angle)
  const tip = { x: tipPoint.x - along.x * back, y: tipPoint.y - along.y * back }
  const at = (t: number) => ({
    x: start.x + (tip.x - start.x) * t,
    y: start.y + (tip.y - start.y) * t,
  })

  const segment = (from: number, to: number, width: number, stroke: string): void => {
    const a = at(from)
    const b = at(to)
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  ctx.lineCap = 'round'
  segment(0, 1, 5, shade(color, -0.5))
  segment(0, 0.92, 2, shade(color, -0.1))
  ctx.lineCap = 'butt'
  segment(0.45, 0.58, 7, shade(color, -0.45)) // fume extractor
  segment(0.88, 1, 7.5, shade(color, -0.6)) // muzzle brake
}

const drawLabel = (ctx: Canvas2D, tank: TankState, pose: TankPose, look: TankLook): void => {
  const top = pose.base.y - 46
  ctx.font = '600 13px "Exo 2", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#e9ecff'
  ctx.fillText(tank.name, pose.base.x, top)
  if (!look.active) return

  const bob = Math.sin(look.time * 5) * 3
  ctx.fillStyle = tank.color
  ctx.beginPath()
  ctx.moveTo(pose.base.x - 7, top - 24 + bob)
  ctx.lineTo(pose.base.x + 7, top - 24 + bob)
  ctx.lineTo(pose.base.x, top - 14 + bob)
  ctx.closePath()
  ctx.fill()
}

const GUIDE_BASE_LENGTH = 30
const GUIDE_LENGTH_PER_POWER = 2.2

/** Dashed aiming line out of the muzzle; its length grows with power. */
export const drawAimGuide = (
  ctx: Canvas2D,
  tank: TankState,
  terrain: TerrainView,
  dragging: boolean,
  time: number,
): void => {
  const pose = tankPose(tank, terrain)
  const angle = worldAngle(pose, tank.angle)
  const radians = (angle * Math.PI) / 180
  const direction = { x: Math.cos(radians), y: -Math.sin(radians) }
  const start = muzzle(pose, angle)
  const length = GUIDE_BASE_LENGTH + tank.power * GUIDE_LENGTH_PER_POWER
  const end = { x: start.x + direction.x * length, y: start.y + direction.y * length }

  ctx.save()
  ctx.globalAlpha = dragging ? 0.95 : 0.6
  ctx.strokeStyle = tank.color
  ctx.lineWidth = 2
  ctx.setLineDash([7, 6])
  ctx.lineDashOffset = -time * 24
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.fillStyle = tank.color
  ctx.beginPath()
  ctx.moveTo(end.x + direction.x * 8, end.y + direction.y * 8)
  ctx.lineTo(end.x - direction.y * 5, end.y + direction.x * 5)
  ctx.lineTo(end.x + direction.y * 5, end.y - direction.x * 5)
  ctx.closePath()
  ctx.fill()

  if (dragging) {
    ctx.globalAlpha = 1
    ctx.font = '600 14px "Exo 2", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${tank.angle.toFixed(1)}° · ${tank.power.toFixed(1)}`, end.x, end.y - 14)
  }
  ctx.restore()
}
