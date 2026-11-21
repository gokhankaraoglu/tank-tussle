import { Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const thumper: WeaponDefinition = {
  id: 'thumper',
  name: 'Thumper',
  description: 'A heavy shell with a wide blast.',
  rating: 3,
  traits: ['Big blast'],
  launch: (params) => [
    launchFromBarrel(params, new Explosive(45, 275, { color: '#ffd27a', radius: 5 })),
  ],
}
