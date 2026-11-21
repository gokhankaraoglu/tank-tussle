import { WORLD } from './constants.js'
import { createTank, type TankState } from './tank/tank.js'

export const flatHeights = (height = 200): number[] =>
  Array.from({ length: WORLD.width }, () => height)

export const tanksAt = (x0: number, x1: number): [TankState, TankState] => [
  createTank('Alice', '#ff0000', x0, 45),
  createTank('Bob', '#0000ff', x1, 135),
]
