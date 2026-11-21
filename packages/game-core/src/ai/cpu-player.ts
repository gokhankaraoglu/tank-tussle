import { clampAngle, opponentOf, tankCenter, type PlayerIndex } from '../tank/tank.js'
import { tankPose } from '../tank/tank-pose.js'
import { predictImpact } from '../simulation/trajectory.js'
import { Terrain } from '../terrain/terrain.js'
import type { Rng } from '../random/rng.js'
import { openSlots } from '../match/match.js'
import type { FireCommand, MatchState } from '../match/types.js'
import type { WeaponRegistry } from '../weapons/registry.js'
import { clamp } from '../math/vector.js'

export const CPU_LEVELS = { min: 1, max: 8 } as const

interface Candidate {
  readonly angle: number
  readonly power: number
  readonly miss: number
}

/**
 * Searches angle/power space with the trajectory predictor, then adds aiming error
 * that shrinks as the level rises. Level 8 is near perfect.
 */
export const chooseCpuShot = (
  state: MatchState,
  player: PlayerIndex,
  level: number,
  registry: WeaponRegistry,
  rng: Rng,
): FireCommand => {
  const skill = clamp(Math.round(level), CPU_LEVELS.min, CPU_LEVELS.max)
  const best = findBestAim(state, player)
  const error = CPU_LEVELS.max - skill

  return {
    angle: clampAngle(best.angle + rng.range(-1, 1) * error * 2.2),
    power: clamp(best.power + rng.range(-1, 1) * error * 2.5, 5, 100),
    slot: chooseSlot(state, player, skill, registry, rng),
  }
}

const findBestAim = (state: MatchState, player: PlayerIndex): Candidate => {
  const terrain = Terrain.fromLayers(state.terrain)
  const target = tankCenter(state.tanks[opponentOf(player)], terrain)
  const facesRight = target.x > state.tanks[player].x
  const tilt = tankPose(state.tanks[player], terrain).tilt
  // Search world directions towards the target, then convert to hull-relative elevation.
  const [minWorld, maxWorld] = facesRight ? [15, 85] : [95, 165]

  let best: Candidate = { angle: facesRight ? 45 : 135, power: 60, miss: Number.POSITIVE_INFINITY }
  for (let world = minWorld; world <= maxWorld; world += 2.5) {
    const angle = world - tilt
    if (clampAngle(angle) !== angle) continue
    for (let power = 20; power <= 100; power += 2) {
      const impact = predictImpact(terrain, state.tanks, player, angle, power)
      if (!impact) continue
      const miss = impact.hitPlayer === opponentOf(player) ? 0 : Math.abs(impact.point.x - target.x)
      if (miss < best.miss) best = { angle, power, miss }
    }
  }
  return best
}

/** Strong CPUs save their best weapons for last; weak ones pick at random. */
const chooseSlot = (
  state: MatchState,
  player: PlayerIndex,
  skill: number,
  registry: WeaponRegistry,
  rng: Rng,
): number => {
  const inventory = state.inventories[player]
  if (inventory.length === 0) return 0
  if (skill < 5) return rng.int(0, inventory.length - 1)

  const ratings = inventory.map((id) => registry.get(id).rating)
  const target = Math.max(...ratings)
  return ratings.indexOf(target)
}

/** CPU shop strategy: always take the highest-rated weapon still on offer. */
export const chooseCpuPick = (state: MatchState, registry: WeaponRegistry): number => {
  const rating = (slot: number) => registry.get(state.shop.pool[slot]!).rating
  return openSlots(state.shop).reduce((best, slot) => (rating(slot) > rating(best) ? slot : best))
}
