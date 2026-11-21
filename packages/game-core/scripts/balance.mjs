// Measures how many points each weapon earns per shot, so damage values can be tuned.
// Usage: npm run balance -w @tank-tussle/game-core   (builds first)
//
// For every weapon it fires one shot on many generated maps with the CPU's aim:
//   perfect = level 8 (no aiming error), skilled = level 6 (a good human player).
// The opponent starts with points so that stealing weapons can be measured too.
import * as core from '../dist/index.js'

const MAPS = 80
const OPPONENT_SCORE = 600
const registry = core.createDefaultWeaponRegistry()
const players = [
  { name: 'A', color: '#ffffff' },
  { name: 'B', color: '#000000' },
]

/** Straight-line aim for weapons that ignore gravity. */
const directAim = (state, level, rng) => {
  const terrain = core.Terrain.fromLayers(state.terrain)
  const pose = core.tankPose(state.tanks[0], terrain)
  const target = core.tankCenter(state.tanks[1], terrain)
  const world = (Math.atan2(pose.pivot.y - target.y, target.x - pose.pivot.x) * 180) / Math.PI
  return { angle: world - pose.tilt + rng.range(-1, 1) * (8 - level) * 0.8, power: 80 }
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

const rows = registry.all().map((weapon) => {
  const earned = { 8: [], 6: [] }
  for (let seed = 1; seed <= MAPS; seed++) {
    const fresh = core.createMatch({ mode: 'practice', players, seed }, registry)
    const state = {
      ...fresh,
      tanks: [fresh.tanks[0], { ...fresh.tanks[1], score: OPPONENT_SCORE }],
    }
    const slot = state.inventories[0].indexOf(weapon.id)
    for (const level of [8, 6]) {
      const rng = core.createRng(seed * 31 + level)
      const aim = weapon.traits.includes('No gravity')
        ? directAim(state, level, rng)
        : core.chooseCpuShot(state, 0, level, registry, rng)
      const { shot } = core.fire(state, 0, { angle: aim.angle, power: aim.power, slot }, registry)
      earned[level].push(shot.scoreDelta[0])
    }
  }
  return {
    weapon: weapon.name,
    stars: weapon.rating,
    perfect: Number(mean(earned[8]).toFixed(1)),
    skilled: Number(mean(earned[6]).toFixed(1)),
    hitRate: `${Math.round((earned[6].filter((points) => points > 0).length / MAPS) * 100)}%`,
  }
})

console.table(rows.sort((a, b) => b.skilled - a.skilled))
