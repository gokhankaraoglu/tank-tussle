import { Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const peashooter: WeaponDefinition = {
  id: 'peashooter',
  name: 'Peashooter',
  description: 'Small and honest. Pays big for a perfect hit.',
  rating: 1,
  traits: ['Precise'],
  launch: (params) => [
    launchFromBarrel(params, new Explosive(22, 265, { color: '#9fdcff', radius: 3 })),
  ],
}
