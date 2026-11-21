import { Explosive, Piercing } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const needle: WeaponDefinition = {
  id: 'needle',
  name: 'Needle',
  description: 'Flies dead straight and punches through hills. Aim right at them.',
  rating: 4,
  traits: ['No gravity', 'Pierces ground'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new Piercing(new Explosive(12, 180, { color: '#ffffff', radius: 2 }, 0), 600),
      { speedScale: 1.4 },
    ),
  ],
}
