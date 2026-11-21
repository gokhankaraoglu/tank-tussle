import { Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

const ROUNDS = 8
const TICKS_BETWEEN_ROUNDS = 5

export const woodpecker: WeaponDefinition = {
  id: 'woodpecker',
  name: 'Woodpecker',
  description: 'Rat-a-tat: a burst of eight small rounds.',
  rating: 3,
  traits: ['Burst ×8'],
  launch: (params) =>
    Array.from({ length: ROUNDS }, (_, index) =>
      launchFromBarrel(params, new Explosive(11, 80, { color: '#fff3a3', radius: 2 }), {
        angleOffset: params.rng.range(-1.5, 1.5),
        speedScale: params.rng.range(0.97, 1.03),
        delayTicks: index * TICKS_BETWEEN_ROUNDS,
      }),
    ),
}
