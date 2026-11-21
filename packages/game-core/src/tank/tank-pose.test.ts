import { describe, expect, it } from 'vitest'
import { TANK, WORLD } from '../constants.js'
import { flatHeights } from '../test-helpers.js'
import { Terrain } from '../terrain/terrain.js'
import { muzzle, tankPose, worldAngle } from './tank-pose.js'

/** Ground rising to the right with the given slope (height per pixel). */
const ramp = (slope: number) =>
  Terrain.fromHeights(flatHeights(200).map((height, x) => height + (x - 500) * slope))

describe('tankPose', () => {
  it('sits level on flat ground', () => {
    const pose = tankPose({ x: 500 }, Terrain.fromHeights(flatHeights(200)))
    expect(pose.tilt).toBeCloseTo(0)
    expect(pose.base.y).toBeCloseTo(WORLD.height - 200)
    expect(pose.pivot.y).toBeCloseTo(WORLD.height - 200 - TANK.pivotHeight)
  })

  it('leans with the slope: right end up on rising ground', () => {
    expect(tankPose({ x: 500 }, ramp(0.5)).tilt).toBeCloseTo(26.57, 1)
    expect(tankPose({ x: 500 }, ramp(-0.5)).tilt).toBeCloseTo(-26.57, 1)
  })

  it('tips the turret pivot away from vertical on a slope', () => {
    const pose = tankPose({ x: 500 }, ramp(0.5))
    expect(pose.pivot.x).toBeLessThan(500)
    expect(Math.hypot(pose.up.x, pose.up.y)).toBeCloseTo(1)
  })

  it('never tilts beyond the maximum', () => {
    expect(tankPose({ x: 500 }, ramp(5)).tilt).toBe(TANK.maxTilt)
  })

  it('rests on a bump under its middle instead of sinking into it', () => {
    const bump = flatHeights(200).map((height, x) => (x === 500 ? 230 : height))
    expect(tankPose({ x: 500 }, Terrain.fromHeights(bump)).base.y).toBeCloseTo(WORLD.height - 230)
  })
})

describe('worldAngle', () => {
  it('turns the barrel together with the hull', () => {
    expect(worldAngle({ tilt: 0 }, 45)).toBe(45)
    expect(worldAngle({ tilt: 20 }, 45)).toBe(65)
    expect(worldAngle({ tilt: -20 }, 45)).toBe(25)
  })
})

describe('muzzle', () => {
  it('starts shells a barrel length from the pivot', () => {
    const pose = tankPose({ x: 500 }, ramp(0.3))
    const tip = muzzle(pose, 60)
    expect(Math.hypot(tip.x - pose.pivot.x, tip.y - pose.pivot.y)).toBeCloseTo(TANK.barrelLength)
  })
})
