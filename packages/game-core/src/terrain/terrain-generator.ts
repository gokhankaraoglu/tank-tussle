import { TERRAIN, WORLD } from '../constants.js'
import { clamp } from '../math/vector.js'
import type { Rng } from '../random/rng.js'

/** Overall shape of a battlefield. Each one puts something between the two tanks. */
export type Landscape = 'mountain' | 'twin-peaks' | 'mesa' | 'canyon'
export const LANDSCAPES: readonly Landscape[] = ['mountain', 'twin-peaks', 'mesa', 'canyon']

const PAD_HALF_WIDTH = 22
const PAD_BLEND = 24
/** How much a pad is levelled: 1 = perfectly flat. Some slope is kept so tanks start tilted. */
const PAD_LEVELLING = 0.6

/**
 * Natural-looking, deterministic terrain:
 * fractal value noise for hills and rough ground, a landscape feature between the tanks
 * so direct shots are blocked, and gentler pads where the tanks start.
 */
export const generateTerrain = (
  rng: Rng,
  tankXs: readonly [number, number],
  width: number = WORLD.width,
): number[] => {
  const landscape = rng.pick(LANDSCAPES)
  const base = rng.range(140, 210)
  const hills = fractalNoise(rng, width, { cells: 3, octaves: 5, amplitude: 110 })
  const feature = landscapeFeature(rng, landscape, tankXs, width)

  const raw = Array.from({ length: width }, (_, x) => base + (hills[x] ?? 0) + (feature[x] ?? 0))
  const padded = tankXs.reduce((heights, tankX) => flattenPad(heights, tankX), raw)
  return padded.map((height) => clamp(height, TERRAIN.minHeight, TERRAIN.maxHeight))
}

interface NoiseOptions {
  /** Control points for the first octave. */
  readonly cells: number
  readonly octaves: number
  readonly amplitude: number
}

/** Sum of smoothly interpolated random values; each octave doubles detail and halves strength. */
const fractalNoise = (rng: Rng, width: number, options: NoiseOptions): number[] => {
  const result = new Array<number>(width).fill(0)
  let cells = options.cells
  let amplitude = options.amplitude
  for (let octave = 0; octave < options.octaves; octave++) {
    const points = Array.from({ length: cells + 2 }, () => rng.range(-1, 1))
    for (let x = 0; x < width; x++) {
      const position = (x / width) * cells
      const index = Math.floor(position)
      const t = smooth(position - index)
      const value = (points[index] ?? 0) * (1 - t) + (points[index + 1] ?? 0) * t
      result[x] = (result[x] ?? 0) + value * amplitude
    }
    cells *= 2
    amplitude *= 0.5
  }
  return result
}

/** The obstacle (or gap) between the tanks that makes each map play differently. */
const landscapeFeature = (
  rng: Rng,
  landscape: Landscape,
  [left, right]: readonly [number, number],
  width: number,
): number[] => {
  const middle = (left + right) / 2 + rng.range(-60, 60)
  const span = right - left

  const shapes: Record<Landscape, (x: number) => number> = {
    mountain: bump(middle, rng.range(span * 0.12, span * 0.2), rng.range(170, 260)),
    'twin-peaks': (() => {
      const gap = rng.range(span * 0.12, span * 0.2)
      const first = bump(middle - gap, rng.range(45, 75), rng.range(130, 220))
      const second = bump(middle + gap, rng.range(45, 75), rng.range(130, 220))
      return (x: number) => first(x) + second(x)
    })(),
    mesa: plateau(middle, rng.range(span * 0.12, span * 0.22), rng.range(130, 200)),
    canyon: (() => {
      const walls = plateau(middle, rng.range(span * 0.25, span * 0.32), rng.range(120, 180))
      const gorge = bump(middle, rng.range(25, 45), -rng.range(150, 220))
      return (x: number) => walls(x) + gorge(x)
    })(),
  }

  const shape = shapes[landscape]
  return Array.from({ length: width }, (_, x) => shape(x))
}

/** Gaussian hill. */
const bump =
  (center: number, spread: number, height: number) =>
  (x: number): number =>
    height * Math.exp(-((x - center) ** 2) / (2 * spread * spread))

/** Flat-topped hill with steep, cliff-like sides. */
const plateau =
  (center: number, halfWidth: number, height: number) =>
  (x: number): number => {
    const distance = Math.abs(x - center)
    const edge = 18
    return height * (1 - smooth(clamp((distance - halfWidth) / edge + 0.5, 0, 1)))
  }

/** Eases the ground around a tank so it can stand, blending into the surrounding terrain. */
const flattenPad = (heights: number[], centerX: number): number[] => {
  const center = Math.round(centerX)
  const level = average(heights, center - PAD_HALF_WIDTH, center + PAD_HALF_WIDTH)
  return heights.map((height, x) => {
    const distance = Math.abs(x - center)
    if (distance >= PAD_HALF_WIDTH + PAD_BLEND) return height
    const padded = level * PAD_LEVELLING + height * (1 - PAD_LEVELLING)
    if (distance <= PAD_HALF_WIDTH) return padded
    const t = smooth((distance - PAD_HALF_WIDTH) / PAD_BLEND)
    return padded * (1 - t) + height * t
  })
}

const average = (values: readonly number[], from: number, to: number): number => {
  const slice = values.slice(Math.max(0, from), Math.min(values.length, to + 1))
  return slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length)
}

/** Smoothstep easing. */
const smooth = (t: number): number => t * t * (3 - 2 * t)
