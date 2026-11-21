import { TERRAIN, WORLD } from '../constants.js'
import { clamp } from '../math/vector.js'

/** Read-only terrain queries. Weapons and AI depend on this, not on the mutable class. */
export interface TerrainView {
  readonly width: number
  heightAt(x: number): number
  surfaceY(x: number): number
  isSolid(x: number, y: number): boolean
}

/**
 * Serialisable terrain. Each column is solid ground with an optional layer of loose dirt
 * on top (thrown by weapons like Dirtball). `heights` is the total; `dirt` is the part of it
 * that is loose dirt. Both behave the same physically; renderers draw them differently.
 */
export interface TerrainLayers {
  readonly heights: readonly number[]
  readonly dirt: readonly number[]
}

export const flatLayers = (heights: readonly number[]): TerrainLayers => ({
  heights: [...heights],
  dirt: heights.map(() => 0),
})

/**
 * Column-based terrain. Material always settles, so carving or adding a circle only changes
 * column heights. Loose dirt always sits on top of the ground, which keeps the layers simple.
 */
export class Terrain implements TerrainView {
  private constructor(
    private readonly heights: number[],
    private readonly dirt: number[],
  ) {}

  static fromLayers(layers: TerrainLayers): Terrain {
    if (layers.heights.length === 0) throw new Error('Terrain needs at least one column')
    if (layers.dirt.length !== layers.heights.length)
      throw new Error('Terrain layers differ in width')
    return new Terrain([...layers.heights], [...layers.dirt])
  }

  static fromHeights(heights: readonly number[]): Terrain {
    return Terrain.fromLayers(flatLayers(heights))
  }

  get width(): number {
    return this.heights.length
  }

  heightAt(x: number): number {
    return this.heights[this.column(x)] ?? 0
  }

  /** Thickness of loose dirt on top of the ground at x. */
  dirtAt(x: number): number {
    return this.dirt[this.column(x)] ?? 0
  }

  surfaceY(x: number): number {
    return WORLD.height - this.heightAt(x)
  }

  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width) return false
    return y >= this.surfaceY(x)
  }

  /**
   * Removes everything inside the circle; whatever was above it falls down.
   * Loose dirt around the crater then slides into it, solid ground keeps its shape.
   */
  carveCircle(cx: number, cy: number, radius: number): void {
    this.forEachColumnInCircle(cx, cy, radius, (column, bottom, top) => {
      const height = this.heights[column] ?? 0
      const dirt = this.dirt[column] ?? 0
      const removed = overlap(0, height, bottom, top)
      this.heights[column] = Math.max(0, height - removed)
      this.dirt[column] = Math.max(0, dirt - overlap(height - dirt, height, bottom, top))
    })
    this.settleDirt(cx - radius * 3, cx + radius * 3)
  }

  /** Piles loose dirt where the circle sticks out of the ground. */
  addCircle(cx: number, cy: number, radius: number): void {
    this.forEachColumnInCircle(cx, cy, radius, (column, bottom, top) => {
      const height = this.heights[column] ?? 0
      const added = Math.min(
        top - bottom - overlap(0, height, bottom, top),
        TERRAIN.ceiling - height,
      )
      if (added <= 0) return
      this.heights[column] = height + added
      this.dirt[column] = (this.dirt[column] ?? 0) + added
    })
    this.settleDirt(cx - radius * 3, cx + radius * 3)
  }

  /**
   * Loose dirt cannot hold a slope steeper than its angle of repose: it slides downhill
   * until every step between neighbouring columns is gentle enough. Only dirt moves, so
   * cliffs of solid ground survive while dirt piles slump into mounds.
   */
  private settleDirt(from: number, to: number): void {
    const first = Math.max(0, Math.floor(from))
    const last = Math.min(this.width - 2, Math.ceil(to))
    for (let pass = 0; pass < TERRAIN.dirtSettlePasses; pass++) {
      let moved = false
      for (let column = first; column <= last; column++) {
        moved = this.slide(column, column + 1) || moved
        moved = this.slide(column + 1, column) || moved
      }
      if (!moved) return
    }
  }

  /** Moves dirt from `high` to its neighbour `low` if the step between them is too steep. */
  private slide(high: number, low: number): boolean {
    const excess = (this.heights[high] ?? 0) - (this.heights[low] ?? 0) - TERRAIN.dirtReposeSlope
    const available = this.dirt[high] ?? 0
    if (excess <= 0.01 || available <= 0.01) return false
    const amount = Math.min(available, excess / 2)
    this.heights[high] = (this.heights[high] ?? 0) - amount
    this.dirt[high] = available - amount
    this.heights[low] = (this.heights[low] ?? 0) + amount
    this.dirt[low] = (this.dirt[low] ?? 0) + amount
    return true
  }

  /** Raises solid ground (any loose dirt stays on top). Unlike dirt, it does not slump. */
  raiseGround(cx: number, halfWidth: number, height: number): void {
    const first = Math.max(0, Math.round(cx - halfWidth))
    const last = Math.min(this.width - 1, Math.round(cx + halfWidth))
    for (let column = first; column <= last; column++) {
      const current = this.heights[column] ?? 0
      this.heights[column] = Math.min(TERRAIN.ceiling, current + height)
    }
  }

  toLayers(): TerrainLayers {
    return { heights: [...this.heights], dirt: [...this.dirt] }
  }

  toHeights(): number[] {
    return [...this.heights]
  }

  private column(x: number): number {
    return clamp(Math.floor(x), 0, this.heights.length - 1)
  }

  /** Calls `visit` with each column's circle chord expressed as heights (bottom ≤ top). */
  private forEachColumnInCircle(
    cx: number,
    cy: number,
    radius: number,
    visit: (column: number, bottom: number, top: number) => void,
  ): void {
    const first = Math.max(0, Math.ceil(cx - radius))
    const last = Math.min(this.width - 1, Math.floor(cx + radius))
    for (let column = first; column <= last; column++) {
      const dx = column - cx
      const half = Math.sqrt(Math.max(0, radius * radius - dx * dx))
      const top = WORLD.height - (cy - half)
      const bottom = Math.max(0, WORLD.height - (cy + half))
      if (top > bottom) visit(column, bottom, top)
    }
  }
}

/** Length of the intersection of [a1, a2] and [b1, b2]. */
const overlap = (a1: number, a2: number, b1: number, b2: number): number =>
  Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))

/** Unit normal of the surface at x, pointing out of the ground (screen coordinates). */
export const surfaceNormal = (terrain: TerrainView, x: number): { x: number; y: number } => {
  const slope = (terrain.heightAt(x + 2) - terrain.heightAt(x - 2)) / 4
  const length = Math.hypot(slope, 1)
  return { x: -slope / length, y: -1 / length }
}
