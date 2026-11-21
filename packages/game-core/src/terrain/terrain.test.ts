import { describe, expect, it } from 'vitest'
import { TANK, TERRAIN, WORLD } from '../constants.js'
import { createRng } from '../random/rng.js'
import { flatHeights } from '../test-helpers.js'
import { generateTerrain, LANDSCAPES } from './terrain-generator.js'
import { surfaceNormal, Terrain } from './terrain.js'

describe('Terrain', () => {
  it('reports the surface and solidity of a column', () => {
    const terrain = Terrain.fromHeights(flatHeights(200))
    expect(terrain.surfaceY(10)).toBe(WORLD.height - 200)
    expect(terrain.isSolid(10, WORLD.height - 199)).toBe(true)
    expect(terrain.isSolid(10, WORLD.height - 201)).toBe(false)
    expect(terrain.isSolid(-1, WORLD.height)).toBe(false)
  })

  it('carves a crater whose depth matches the circle chord', () => {
    const terrain = Terrain.fromHeights(flatHeights(200))
    const surface = terrain.surfaceY(500)
    terrain.carveCircle(500, surface, 30)

    expect(terrain.heightAt(500)).toBeCloseTo(170)
    expect(terrain.heightAt(400)).toBe(200)
  })

  it('lets dirt above an underground cavity fall down', () => {
    const terrain = Terrain.fromHeights(flatHeights(200))
    terrain.carveCircle(500, WORLD.height - 100, 20)
    expect(terrain.heightAt(500)).toBeCloseTo(160)
  })

  it('adds only the part of a dirt ball that is above ground', () => {
    const terrain = Terrain.fromHeights(flatHeights(200))
    terrain.addCircle(500, terrain.surfaceY(500), 30)
    expect(terrain.heightAt(500)).toBeCloseTo(230)
  })

  it('never removes more dirt than exists', () => {
    const terrain = Terrain.fromHeights(flatHeights(10))
    terrain.carveCircle(500, WORLD.height, 100)
    expect(terrain.heightAt(500)).toBe(0)
  })

  it('does not mutate the heights it was created from', () => {
    const heights = flatHeights(200)
    Terrain.fromHeights(heights).carveCircle(500, 400, 50)
    expect(heights[500]).toBe(200)
  })

  it('points the normal straight up on flat ground', () => {
    const normal = surfaceNormal(Terrain.fromHeights(flatHeights()), 500)
    expect(normal.x).toBeCloseTo(0)
    expect(normal.y).toBeCloseTo(-1)
  })

  describe('loose dirt', () => {
    const totalDirt = (terrain: Terrain) =>
      terrain.toLayers().dirt.reduce((sum, value) => sum + value, 0)

    it('records added dirt as its own layer on top of the ground', () => {
      const terrain = Terrain.fromHeights(flatHeights(200))
      terrain.addCircle(500, terrain.surfaceY(500), 30)
      expect(terrain.dirtAt(500)).toBeGreaterThan(10)
      expect(terrain.heightAt(500)).toBeCloseTo(200 + terrain.dirtAt(500))
      expect(terrain.dirtAt(400)).toBe(0)
    })

    it('lets loose dirt slump to its angle of repose without losing any', () => {
      const terrain = Terrain.fromHeights(flatHeights(200))
      const circle = Terrain.fromHeights(flatHeights(200))
      terrain.addCircle(500, terrain.surfaceY(500), 30)
      const { heights } = terrain.toLayers()
      for (let x = 400; x < 600; x++) {
        expect(Math.abs(heights[x]! - heights[x + 1]!)).toBeLessThanOrEqual(
          TERRAIN.dirtReposeSlope + 0.05,
        )
      }
      expect(totalDirt(terrain)).toBeCloseTo((Math.PI * 30 * 30) / 2, -1)
      expect(circle.heightAt(500)).toBe(200)
    })

    it('slides dirt off a cliff but never moves the cliff itself', () => {
      const cliff = flatHeights(100).map((height, x) => (x < 500 ? 300 : height))
      const terrain = Terrain.fromHeights(cliff)
      terrain.addCircle(490, terrain.surfaceY(490), 25)
      const ground = (x: number) => terrain.heightAt(x) - terrain.dirtAt(x)

      expect(ground(495)).toBeCloseTo(300)
      expect(ground(505)).toBeCloseTo(100)
      expect(terrain.dirtAt(505)).toBeGreaterThan(0)
    })

    it('removes dirt before ground when a crater cuts through both', () => {
      const terrain = Terrain.fromHeights(flatHeights(200))
      terrain.addCircle(500, terrain.surfaceY(500), 30)
      const before = totalDirt(terrain)
      terrain.carveCircle(500, terrain.surfaceY(500), 10)
      expect(totalDirt(terrain)).toBeLessThan(before)
      expect(terrain.heightAt(500) - terrain.dirtAt(500)).toBeCloseTo(200)
    })

    it('keeps the dirt on top when the ground below it is carved', () => {
      const terrain = Terrain.fromHeights(flatHeights(200))
      terrain.addCircle(500, terrain.surfaceY(500), 30)
      const dirt = terrain.dirtAt(500)
      terrain.carveCircle(500, WORLD.height - 100, 20)
      expect(terrain.dirtAt(500)).toBeCloseTo(dirt)
    })

    it('round-trips through layers', () => {
      const terrain = Terrain.fromHeights(flatHeights(200))
      terrain.addCircle(300, terrain.surfaceY(300), 25)
      expect(Terrain.fromLayers(terrain.toLayers()).toLayers()).toEqual(terrain.toLayers())
    })
  })
})

describe('generateTerrain', () => {
  const tanks = [150, 850] as const
  const generate = (seed: number) => generateTerrain(createRng(seed), tanks)

  it('is deterministic for a seed', () => {
    expect(generate(7)).toEqual(generate(7))
    expect(generate(7)).not.toEqual(generate(8))
  })

  it('stays within the allowed height range', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const height of generate(seed)) {
        expect(height).toBeGreaterThanOrEqual(TERRAIN.minHeight)
        expect(height).toBeLessThanOrEqual(TERRAIN.maxHeight)
      }
    }
  })

  it('gives each tank a pad gentle enough to stand on', () => {
    for (let seed = 0; seed < 40; seed++) {
      const heights = generate(seed)
      for (const x of tanks) {
        const slope = Math.abs(heights[x + 13]! - heights[x - 13]!) / 26
        expect(slope).toBeLessThan(Math.tan((TANK.maxTilt * Math.PI) / 180))
      }
    }
  })

  it('puts an obstacle between the tanks on most maps', () => {
    let blocked = 0
    for (let seed = 0; seed < 40; seed++) {
      const heights = generate(seed)
      const between = Math.max(...heights.slice(tanks[0] + 60, tanks[1] - 60))
      if (between > Math.max(heights[tanks[0]]!, heights[tanks[1]]!) + 40) blocked++
    }
    expect(blocked).toBeGreaterThanOrEqual(30)
  })

  it('offers several landscapes', () => {
    expect(LANDSCAPES.length).toBeGreaterThanOrEqual(4)
  })
})
