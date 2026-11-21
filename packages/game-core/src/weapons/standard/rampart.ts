import { WallBuilder } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const rampart: WeaponDefinition = {
  id: 'rampart',
  name: 'Rampart',
  description: 'No damage: raises a solid wall. Hide behind it, or lift the enemy sky-high.',
  rating: 2,
  traits: ['Builds a wall'],
  launch: (params) => [
    launchFromBarrel(params, new WallBuilder(11, 95, { color: '#c9c2b8', radius: 5 })),
  ],
}
