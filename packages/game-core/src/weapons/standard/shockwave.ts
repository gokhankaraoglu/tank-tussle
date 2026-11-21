import { Knockback } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const shockwave: WeaponDefinition = {
  id: 'shockwave',
  name: 'Shockwave',
  description: 'A blast that shoves nearby tanks away: off their hill or into a pit.',
  rating: 3,
  traits: ['Knockback'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new Knockback(
        { radius: 38, damage: 230, range: 110, distance: 90 },
        { color: '#8ab4ff', radius: 5 },
      ),
    ),
  ],
}
