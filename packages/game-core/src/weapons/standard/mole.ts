import { Digger } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const mole: WeaponDefinition = {
  id: 'mole',
  name: 'Mole',
  description: 'Tunnels along just under the surface and blows up beneath the enemy.',
  rating: 3,
  traits: ['Burrows'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new Digger(
        { steps: 20, stepDistance: 9, depth: 12, tunnelRadius: 7, blastRadius: 32, damage: 215 },
        { color: '#c8a27a', radius: 4 },
      ),
    ),
  ],
}
