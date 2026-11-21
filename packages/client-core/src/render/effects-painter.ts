import type { DustCloud, ExplosionSprite, MuzzleFlash, ScorePopup, Trail } from './render-scene.js'
import type { Canvas2D } from './canvas-2d.js'

/** Short-lived visual effects: trails, projectiles, explosions, dust and score pop-ups. */
export const drawTrail = (ctx: Canvas2D, { color, points }: Trail): void => {
  ctx.lineCap = 'round'
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!
    const to = points[index]!
    ctx.globalAlpha = (index / points.length) * 0.6
    ctx.strokeStyle = color
    ctx.lineWidth = 1 + (index / points.length) * 2
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

const GLOW_SPREAD = 12

/**
 * Soft halo drawn with a radial gradient instead of `shadowBlur`: Android WebView's GPU
 * rasteriser can wipe earlier drawImage() output when shadows and gradients share a frame
 * (the sky disappeared), and gradients are cheaper on phones anyway.
 */
export const drawHalo = (
  ctx: Canvas2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  color: string,
  strength = 0.55,
): void => {
  const halo = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius)
  halo.addColorStop(0, color)
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.save()
  ctx.globalAlpha = strength
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export const drawGlow = (
  ctx: Canvas2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void => {
  drawHalo(ctx, x, y, radius * 0.5, radius + GLOW_SPREAD, color)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

export const drawExplosion = (ctx: Canvas2D, { x, y, radius, progress }: ExplosionSprite): void => {
  const eased = 1 - (1 - progress) ** 3
  const current = Math.max(1, radius * (0.4 + 0.8 * eased))
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, current)
  gradient.addColorStop(0, `rgba(255, 255, 220, ${1 - progress})`)
  gradient.addColorStop(0.4, `rgba(255, 170, 60, ${0.9 * (1 - progress)})`)
  gradient.addColorStop(1, 'rgba(255, 60, 30, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, current, 0, Math.PI * 2)
  ctx.fill()
}

const DUST_CLUMPS = 14

/** A brown puff and clumps of earth flying outward — clearly not a fireball. */
export const drawDust = (ctx: Canvas2D, { x, y, radius, progress }: DustCloud): void => {
  const fade = 1 - progress
  const eased = 1 - (1 - progress) ** 2

  const puff = ctx.createRadialGradient(x, y, 0, x, y, radius * (0.6 + 0.7 * eased))
  puff.addColorStop(0, `rgba(196, 150, 98, ${0.55 * fade})`)
  puff.addColorStop(1, 'rgba(150, 110, 70, 0)')
  ctx.fillStyle = puff
  ctx.beginPath()
  ctx.arc(x, y, radius * (0.6 + 0.7 * eased), 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(120, 80, 45, ${fade})`
  for (let clump = 0; clump < DUST_CLUMPS; clump++) {
    const angle = Math.PI + (clump / (DUST_CLUMPS - 1)) * Math.PI
    const distance = radius * (0.4 + 0.9 * eased) * (0.7 + ((clump * 7) % 5) / 10)
    const drop = progress * progress * radius * 0.8
    ctx.fillRect(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance + drop, 3, 3)
  }
}

export const drawPopup = (ctx: Canvas2D, { x, y, text, color, progress }: ScorePopup): void => {
  ctx.globalAlpha = 1 - progress
  ctx.font = '20px Audiowide, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.fillText(text, x, y - progress * 40)
  ctx.globalAlpha = 1
}

export const drawMuzzleFlash = (ctx: Canvas2D, { x, y, progress }: MuzzleFlash): void => {
  const radius = 14 * (1 - progress * 0.6)
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
  glow.addColorStop(0, `rgba(255, 250, 210, ${1 - progress})`)
  glow.addColorStop(0.5, `rgba(255, 190, 80, ${0.8 * (1 - progress)})`)
  glow.addColorStop(1, 'rgba(255, 120, 40, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}
