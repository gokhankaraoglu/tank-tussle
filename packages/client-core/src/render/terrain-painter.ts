import { createRng, WORLD, type TerrainLayers } from '@tank-tussle/game-core'
import type { Canvas2D, Layer, LayerFactory, LayerImage } from './canvas-2d.js'

// Warm, fairly light rock so the ground stands out clearly against the night sky.
const ROCK_STRATA = ['#6d5a4c', '#5f4f45', '#7a6552', '#665449', '#58493f', '#73604b'] as const
const TOPSOIL = '#4e3a26'
const GRASS = '#7fd65a'
const MOSS = '#3f9a45'
const DIRT_EDGE = '#f0c38a'
/** Steeper than this (height change per pixel) and grass gives way to bare rock. */
const GRASS_MAX_SLOPE = 1.1

/**
 * Draws the battlefield: layered rock, topsoil and grass for the ground, and sandy loose dirt
 * (from Mudslide and friends) on top. Repaints only when the terrain object changes.
 */
export class TerrainPainter {
  private layer: Layer
  private rock: LayerImage
  private dirtPattern: object | null
  private painted: TerrainLayers | null = null

  constructor(
    ratio: number,
    private readonly createLayer: LayerFactory,
  ) {
    this.layer = createLayer(WORLD.width, WORLD.height, ratio)
    this.rock = paintRock(createLayer, ratio)
    this.dirtPattern = this.layer.context.createPattern(paintDirtTile(createLayer), 'repeat')
  }

  resize(ratio: number): void {
    this.layer = this.createLayer(WORLD.width, WORLD.height, ratio)
    this.rock = paintRock(this.createLayer, ratio)
    this.dirtPattern = this.layer.context.createPattern(paintDirtTile(this.createLayer), 'repeat')
    this.painted = null
  }

  draw(ctx: Canvas2D, terrain: TerrainLayers): void {
    if (terrain !== this.painted) this.paint(terrain)
    ctx.drawImage(this.layer.image, 0, 0, WORLD.width, WORLD.height)
  }

  private paint(terrain: TerrainLayers): void {
    this.painted = terrain
    const ctx = this.layer.context
    const { heights, dirt } = terrain
    const groundTop = heights.map((height, x) => WORLD.height - (height - (dirt[x] ?? 0)))
    ctx.clearRect(0, 0, WORLD.width, WORLD.height)

    this.paintRock(ctx, groundTop)
    paintSurface(ctx, groundTop)
    this.paintDirt(ctx, heights, dirt)
  }

  private paintRock(ctx: Canvas2D, groundTop: readonly number[]): void {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(0, WORLD.height)
    groundTop.forEach((y, x) => ctx.lineTo(x, y))
    ctx.lineTo(WORLD.width, WORLD.height)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(this.rock, 0, 0, WORLD.width, WORLD.height)
    ctx.restore()
  }

  private paintDirt(ctx: Canvas2D, heights: readonly number[], dirt: readonly number[]): void {
    if (!this.dirtPattern) return
    ctx.fillStyle = this.dirtPattern
    dirt.forEach((thickness, x) => {
      if (thickness > 0.5) ctx.fillRect(x, WORLD.height - (heights[x] ?? 0), 1, thickness)
    })
    ctx.fillStyle = DIRT_EDGE
    dirt.forEach((thickness, x) => {
      if (thickness > 0.5) ctx.fillRect(x, WORLD.height - (heights[x] ?? 0), 1, 1.5)
    })
  }
}

/** Topsoil under every column, grass only where the slope is gentle enough to hold it. */
const paintSurface = (ctx: Canvas2D, groundTop: readonly number[]): void => {
  groundTop.forEach((top, x) => {
    if (top >= WORLD.height) return
    const slope = Math.abs((groundTop[x + 2] ?? top) - (groundTop[x - 2] ?? top)) / 4
    ctx.fillStyle = TOPSOIL
    ctx.fillRect(x, top, 1, Math.min(16, WORLD.height - top))
    if (slope > GRASS_MAX_SLOPE) return
    ctx.fillStyle = MOSS
    ctx.fillRect(x, top, 1, 7)
    ctx.fillStyle = GRASS
    ctx.fillRect(x, top, 1, 3)
  })
}

/** Horizontal sedimentary layers with speckles, darkening with depth. Painted once. */
const paintRock = (createLayer: LayerFactory, ratio: number): LayerImage => {
  const { image, context: ctx } = createLayer(WORLD.width, WORLD.height, ratio)
  const rng = createRng(4242)

  let y = 0
  let band = 0
  while (y < WORLD.height) {
    const thickness = rng.range(10, 26)
    const wave = {
      amplitude: rng.range(2, 6),
      frequency: rng.range(0.004, 0.012),
      phase: rng.range(0, 6),
    }
    ctx.fillStyle = ROCK_STRATA[band % ROCK_STRATA.length]!
    ctx.beginPath()
    for (let x = 0; x <= WORLD.width; x += 10) {
      ctx.lineTo(x, y + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude)
    }
    ctx.lineTo(WORLD.width, WORLD.height)
    ctx.lineTo(0, WORLD.height)
    ctx.closePath()
    ctx.fill()
    y += thickness
    band++
  }

  for (let speck = 0; speck < 3500; speck++) {
    ctx.fillStyle = rng.next() < 0.5 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.07)'
    ctx.fillRect(
      rng.range(0, WORLD.width),
      rng.range(0, WORLD.height),
      rng.range(1, 3),
      rng.range(1, 2),
    )
  }

  const depth = ctx.createLinearGradient(0, 0, 0, WORLD.height)
  depth.addColorStop(0, 'rgba(0, 0, 0, 0)')
  depth.addColorStop(1, 'rgba(0, 0, 0, 0.35)')
  ctx.fillStyle = depth
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)
  return image
}

/** Sandy, pebbly tile for loose dirt so it reads clearly against the darker ground. */
const paintDirtTile = (createLayer: LayerFactory): LayerImage => {
  const size = 48
  const { image, context: ctx } = createLayer(size, size, 1)
  const rng = createRng(77)
  ctx.fillStyle = '#b57d45'
  ctx.fillRect(0, 0, size, size)
  for (let grain = 0; grain < 220; grain++) {
    ctx.fillStyle = rng.pick(['#8c5a2e', '#d39a5c', '#a06a38', '#e3b27a'])
    ctx.fillRect(rng.int(0, size - 1), rng.int(0, size - 1), rng.int(1, 2), rng.int(1, 2))
  }
  for (let pebble = 0; pebble < 6; pebble++) {
    ctx.fillStyle = 'rgba(70, 45, 25, 0.8)'
    ctx.beginPath()
    ctx.arc(rng.range(3, size - 3), rng.range(3, size - 3), rng.range(1.2, 2.4), 0, Math.PI * 2)
    ctx.fill()
  }
  return image
}
