import { Explosive, Homing } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const bloodhound: WeaponDefinition = {
  id: 'bloodhound',
  name: 'Bloodhound',
  description: 'Sniffs out the enemy once it starts falling.',
  rating: 5,
  traits: ['Homing'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new Homing(new Explosive(26, 135, { color: '#ff7b7b', radius: 4 }), 0.035),
    ),
  ],
}
