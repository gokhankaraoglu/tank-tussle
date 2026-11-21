import { describe, expect, it } from 'vitest'
import { PHYSICS, SCORING, TANK, WORLD } from '../constants.js'
import { flatHeights, tanksAt } from '../test-helpers.js'
import { createDefaultWeaponRegistry } from '../weapons/registry.js'
import { scoreHit, simulateShot, type ShotSetup } from './shot-simulator.js'
import { predictImpact } from './trajectory.js'
import { flatLayers, Terrain } from '../terrain/terrain.js'

const registry = createDefaultWeaponRegistry()

const setup = (overrides: Partial<ShotSetup> & { weaponId?: string } = {}): ShotSetup => {
  const weaponId = overrides.weaponId ?? 'peashooter'
  return {
    terrain: flatLayers(flatHeights()),
    tanks: tanksAt(100, 900),
    shooter: 0,
    input: { angle: 45, power: 60, weaponId },
    weapon: registry.get(weaponId),
    seed: 42,
    ...overrides,
  }
}

describe('simulateShot', () => {
  it('lands a shell roughly where projectile motion predicts on flat ground', () => {
    const result = simulateShot(setup())
    const explosion = result.events.find((event) => event.kind === 'explosion')

    const speed = 60 * PHYSICS.powerToSpeed
    const idealRange = (speed * speed) / PHYSICS.gravity
    expect(explosion).toBeDefined()
    expect(explosion!.x).toBeGreaterThan(100 + idealRange * 0.9)
    expect(explosion!.x).toBeLessThan(100 + idealRange * 1.1)
  })

  it('carves the terrain where the shell explodes', () => {
    const result = simulateShot(setup())
    const explosion = result.events.find((event) => event.kind === 'explosion')!
    expect(result.terrain.heights[Math.round(explosion.x)]).toBeLessThan(200)
  })

  it('awards points to the shooter for hitting the opponent', () => {
    const shooterX = 100
    const terrain = Terrain.fromHeights(flatHeights())
    const tanks = tanksAt(shooterX, 900)
    const power = findPowerThatHits(terrain, tanks)

    const result = simulateShot(
      setup({
        tanks,
        input: { angle: 45, power, weaponId: 'thumper' },
        weapon: registry.get('thumper'),
      }),
    )
    expect(result.scoreDelta[0]).toBeGreaterThan(0)
    expect(result.scoreDelta[1]).toBe(0)
  })

  it('awards points to the opponent when you hit yourself', () => {
    const result = simulateShot(
      setup({
        input: { angle: 90, power: 30, weaponId: 'thumper' },
        weapon: registry.get('thumper'),
      }),
    )
    expect(result.scoreDelta[0]).toBe(0)
    expect(result.scoreDelta[1]).toBeGreaterThan(0)
  })

  it('is deterministic for every weapon', () => {
    for (const weapon of registry.all()) {
      const config = setup({ weapon, input: { angle: 50, power: 55, weaponId: weapon.id } })
      expect(simulateShot(config)).toEqual(simulateShot(config))
    }
  })

  it('finishes every weapon within the tick limit', () => {
    for (const weapon of registry.all()) {
      const result = simulateShot(
        setup({ weapon, input: { angle: 60, power: 70, weaponId: weapon.id } }),
      )
      expect(result.ticks).toBeLessThan(PHYSICS.maxTicks)
      expect(result.frames.at(-1)).toEqual([])
    }
  })

  it('raises the ground with a dirtball without carving a crater', () => {
    const result = simulateShot(
      setup({
        weapon: registry.get('mudslide'),
        input: { angle: 45, power: 60, weaponId: 'mudslide' },
      }),
    )
    expect(Math.max(...result.terrain.heights)).toBeGreaterThan(200)
    expect(Math.max(...result.terrain.dirt)).toBeGreaterThan(0)
    expect(result.events.some((event) => event.kind === 'dirt')).toBe(true)
    expect(result.scoreDelta[1]).toBe(0)
    expect(result.events.some((event) => event.kind === 'explosion')).toBe(false)
  })

  it('ends a shell that leaves the world without exploding', () => {
    const result = simulateShot(
      setup({ input: { angle: 170, power: 100, weaponId: 'peashooter' } }),
    )
    expect(result.events.map((event) => event.kind)).toEqual(['launch'])
  })

  it('records one launch per barrel projectile, but none for fragments', () => {
    const launches = (weaponId: string) =>
      simulateShot(
        setup({ weapon: registry.get(weaponId), input: { angle: 60, power: 60, weaponId } }),
      ).events.filter((event) => event.kind === 'launch')

    expect(launches('woodpecker')).toHaveLength(8)
    expect(launches('popcorn')).toHaveLength(1)
  })

  it('signals bounces and splits for presentation layers', () => {
    const signals = (weaponId: string) =>
      simulateShot(
        setup({ weapon: registry.get(weaponId), input: { angle: 45, power: 60, weaponId } }),
      ).events.flatMap((event) => (event.kind === 'signal' ? [event.signal] : []))

    expect(signals('skipstone')).toContain('bounce')
    expect(signals('meteor-shower')).toEqual(['split'])
  })
})

describe('scoreHit', () => {
  it('pays full damage plus the direct-hit bonus at the centre', () => {
    expect(scoreHit(0, 20, 100)).toEqual({
      points: Math.round(100 * (1 + SCORING.directHitBonus)),
      direct: true,
    })
  })

  it('rewards accuracy: half way out earns well under half', () => {
    const reach = 20 + TANK.radius
    const hit = scoreHit(reach / 2, 20, 100)!
    expect(hit.direct).toBe(false)
    expect(hit.points).toBeLessThan(50)
    expect(hit.points).toBeGreaterThan(0)
  })

  it('gives nothing outside the blast', () => {
    expect(scoreHit(20 + TANK.radius, 20, 100)).toBeNull()
  })
})

describe('weapon behaviours', () => {
  const fireAt = (
    weaponId: string,
    angle: number,
    power: number,
    terrain = flatLayers(flatHeights()),
  ) =>
    simulateShot(
      setup({ terrain, weapon: registry.get(weaponId), input: { angle, power, weaponId } }),
    )

  it('lets the sniper round punch through a hill and hit the tank behind it', () => {
    const hill = flatHeights().map((height, x) => (x > 450 && x < 550 ? height + 30 : height))
    const pivotY = WORLD.height - 200 - TANK.pivotHeight
    const target = { x: 900, y: WORLD.height - 200 - TANK.radius * 0.5 }
    const angle = (Math.atan2(pivotY - target.y, target.x - 100) * 180) / Math.PI
    const result = fireAt('needle', angle, 80, flatLayers(hill))
    expect(result.scoreDelta[0]).toBeGreaterThan(0)
  })

  it('makes the ground hog surface under the opponent', () => {
    const power = findPowerLandingAt(780)
    const result = fireAt('mole', 45, power)
    const blast = result.events.find((event) => event.kind === 'explosion')!
    expect(Math.abs(blast.x - 900)).toBeLessThan(10)
    expect(result.scoreDelta[0]).toBeGreaterThan(0)
  })

  it('scores when a dirtball buries the opponent', () => {
    const result = fireAt('mudslide', 45, findPowerLandingAt(900))
    expect(result.scoreDelta[0]).toBeGreaterThan(0)
  })
})

describe('special weapons', () => {
  const fireAt = (weaponId: string, power: number, tanks = tanksAt(100, 900)) =>
    simulateShot(
      setup({ tanks, weapon: registry.get(weaponId), input: { angle: 45, power, weaponId } }),
    )

  it('Warp teleports the shooter to the landing spot without damage', () => {
    const result = fireAt('warp', findPowerLandingAt(600))
    expect(result.tankX[0]).toBeGreaterThan(590)
    expect(result.tankX[1]).toBe(900)
    expect(result.scoreDelta).toEqual([0, 0])
    expect(result.events.some((event) => event.kind === 'tank-moved')).toBe(true)
  })

  it('Shockwave pushes the opponent away from the blast', () => {
    const result = fireAt('shockwave', findPowerLandingAt(870))
    expect(result.tankX[1]).toBeGreaterThan(905)
    expect(result.tankX[0]).toBe(100)
  })

  it('Leech takes points from the opponent, but never more than they have', () => {
    const rich = tanksAt(100, 900)
    rich[1] = { ...rich[1], score: 500 }
    const power = findPowerLandingAt(895)
    const stolen = fireAt('leech', power, rich)
    expect(stolen.scoreDelta[1]).toBeLessThan(0)
    expect(stolen.scoreDelta[0]).toBeGreaterThan(-stolen.scoreDelta[1])

    const broke = fireAt('leech', power)
    expect(broke.scoreDelta[1]).toBe(0)
  })

  it('Sky Hammer drops its bombs from above the impact point', () => {
    const result = fireAt('sky-hammer', findPowerLandingAt(600))
    const blasts = result.events.filter((event) => event.kind === 'explosion')
    expect(blasts).toHaveLength(5)
    for (const blast of blasts) expect(Math.abs(blast.x - 600)).toBeLessThan(60)
  })

  it('Rampart raises solid ground, not loose dirt', () => {
    const result = fireAt('rampart', findPowerLandingAt(500))
    const peak = Math.max(...result.terrain.heights)
    expect(peak).toBeCloseTo(295)
    expect(Math.max(...result.terrain.dirt)).toBe(0)
  })
})

describe('predictImpact', () => {
  it('agrees with the full simulation for a plain shell', () => {
    const terrain = Terrain.fromHeights(flatHeights())
    const tanks = tanksAt(100, 900)
    const prediction = predictImpact(terrain, tanks, 0, 45, 60)
    const explosion = simulateShot(setup()).events.find((event) => event.kind === 'explosion')!
    expect(prediction!.point.x).toBeCloseTo(explosion.x, 0)
  })
})

function findPowerLandingAt(x: number): number {
  const terrain = Terrain.fromHeights(flatHeights())
  const tanks = tanksAt(100, 900)
  for (let power = 30; power <= 100; power += 0.25) {
    const impact = predictImpact(terrain, tanks, 0, 45, power)
    if (impact && impact.point.x >= x) return power
  }
  throw new Error(`No power lands at ${x}`)
}

function findPowerThatHits(terrain: Terrain, tanks: ReturnType<typeof tanksAt>): number {
  for (let power = 30; power <= 100; power += 0.5) {
    if (predictImpact(terrain, tanks, 0, 45, power)?.hitPlayer === 1) return power
  }
  throw new Error('No power hits the target')
}
