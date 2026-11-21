import { Bouncing, Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const skipstone: WeaponDefinition = {
  id: 'skipstone',
  name: 'Skipstone',
  description: 'Skips across the ground four times before it blows.',
  rating: 3,
  traits: ['Bounces ×4'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new Bouncing(new Explosive(26, 225, { color: '#c49bff', radius: 4 }), 4, 0.75),
    ),
  ],
}
