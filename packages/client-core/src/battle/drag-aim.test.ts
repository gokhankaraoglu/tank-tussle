import { AIM, WORLD, type TankPose } from '@tank-tussle/game-core'
import { describe, expect, it } from 'vitest'
import { aimFromPoint, DRAG_FULL_POWER, toWorldPoint } from './drag-aim.js'

const pose = (tilt: number): TankPose => ({
  base: { x: 200, y: 400 },
  tilt,
  up: { x: 0, y: -1 },
  center: { x: 200, y: 392 },
  pivot: { x: 200, y: 380 },
})

describe('aimFromPoint', () => {
  it('points the barrel at the pointer with power from the distance', () => {
    const aim = aimFromPoint(pose(0), { x: 200 + DRAG_FULL_POWER / 2, y: 380 })
    expect(aim).toEqual({ angle: 0, power: 50 })
    expect(aimFromPoint(pose(0), { x: 200, y: 380 - DRAG_FULL_POWER }).angle).toBe(90)
  })

  it('subtracts the hull tilt, because the angle is measured from the hull', () => {
    expect(aimFromPoint(pose(20), { x: 300, y: 280 }).angle).toBe(25)
  })

  it('caps power and clamps to the barrel range', () => {
    expect(aimFromPoint(pose(0), { x: 2000, y: 380 }).power).toBe(100)
    expect(aimFromPoint(pose(0), { x: 100, y: 420 }).angle).toBe(AIM.maxElevation)
  })
})

describe('toWorldPoint', () => {
  it('maps the element box onto the world', () => {
    const rect = { left: 10, top: 20, width: 500, height: 300 }
    expect(toWorldPoint(260, 170, rect)).toEqual({ x: WORLD.width / 2, y: WORLD.height / 2 })
  })
})
