import { createRng, WORLD, type Rng } from '@tank-tussle/game-core'
import type { Canvas2D, LayerFactory, LayerImage } from './canvas-2d.js'

const STAR_COUNT = 110

interface Star {
  readonly x: number
  readonly y: number
  readonly size: number
  readonly phase: number
}

/** Night sky with a moon and two layers of distant mountains. Static parts are cached. */
export class SkyPainter {
  private backdrop: LayerImage
  private readonly stars: readonly Star[]

  constructor(
    ratio: number,
    private readonly createLayer: LayerFactory,
  ) {
    const rng = createRng(2001)
    this.stars = Array.from({ length: STAR_COUNT }, () => ({
      x: rng.range(0, WORLD.width),
      y: rng.range(0, WORLD.height * 0.4),
      size: rng.range(0.6, 1.8),
      phase: rng.range(0, Math.PI * 2),
    }))
    this.backdrop = paintBackdrop(createLayer, ratio)
  }

  resize(ratio: number): void {
    this.backdrop = paintBackdrop(this.createLayer, ratio)
  }

  draw(ctx: Canvas2D, time: number): void {
    ctx.drawImage(this.backdrop, 0, 0, WORLD.width, WORLD.height)
    // Stars twinkle, so they are drawn every frame. They sit above the mountain tops.
    ctx.fillStyle = '#ffffff'
    for (const star of this.stars) {
      ctx.globalAlpha = 0.3 + 0.35 * Math.sin(time * 1.5 + star.phase)
      ctx.fillRect(star.x, star.y, star.size, star.size)
    }
    ctx.globalAlpha = 1
  }
}

const paintBackdrop = (createLayer: LayerFactory, ratio: number): LayerImage => {
  const { image, context: ctx } = createLayer(WORLD.width, WORLD.height, ratio)
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height)
  sky.addColorStop(0, '#070b1f')
  sky.addColorStop(0.55, '#1b2160')
  sky.addColorStop(1, '#3a2f6e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)

  paintMoon(ctx, 820, 95, 28)
  const rng = createRng(1977)
  paintRidge(ctx, rng, { base: 330, amplitude: 70, color: 'rgba(54, 52, 120, 0.75)' })
  paintRidge(ctx, rng, { base: 390, amplitude: 55, color: 'rgba(31, 30, 78, 0.9)' })

  const haze = ctx.createLinearGradient(0, WORLD.height * 0.5, 0, WORLD.height)
  haze.addColorStop(0, 'rgba(120, 100, 200, 0)')
  haze.addColorStop(1, 'rgba(120, 100, 200, 0.18)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)
  return image
}

const paintMoon = (ctx: Canvas2D, x: number, y: number, radius: number): void => {
  const glow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 4)
  glow.addColorStop(0, 'rgba(255, 244, 214, 0.35)')
  glow.addColorStop(1, 'rgba(255, 244, 214, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8)
  ctx.fillStyle = '#fff4d6'
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(200, 185, 150, 0.35)'
  for (const [dx, dy, r] of [
    [-8, -6, 6],
    [9, 4, 4],
    [-2, 11, 3],
  ] as const) {
    ctx.beginPath()
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

interface RidgeOptions {
  readonly base: number
  readonly amplitude: number
  readonly color: string
}

/** Mountain silhouette made of a few overlapping ridged waves. */
const paintRidge = (ctx: Canvas2D, rng: Rng, { base, amplitude, color }: RidgeOptions): void => {
  const waves = Array.from({ length: 4 }, (_, index) => ({
    amplitude: (amplitude * rng.range(0.5, 1)) / (index + 1),
    frequency: ((index + 1) * rng.range(1.5, 3) * Math.PI * 2) / WORLD.width,
    phase: rng.range(0, Math.PI * 2),
  }))
  ctx.beginPath()
  ctx.moveTo(0, WORLD.height)
  for (let x = 0; x <= WORLD.width; x += 4) {
    // Ridged waves (1 - |sin|) give sharp peaks and rounded valleys, like real mountains.
    const y = waves.reduce(
      (sum, wave) =>
        sum - (1 - Math.abs(Math.sin(wave.frequency * x + wave.phase))) * wave.amplitude,
      base,
    )
    ctx.lineTo(x, y)
  }
  ctx.lineTo(WORLD.width, WORLD.height)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}
