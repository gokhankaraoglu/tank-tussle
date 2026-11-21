import { Explosive } from '../behaviors/index.js'
import { launchFromBarrel, spreadOffsets } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const trident: WeaponDefinition = {
  id: 'trident',
  name: 'Trident',
  description: 'Three shells in a narrow fan.',
  rating: 3,
  traits: ['×3 shells'],
  launch: (params) =>
    spreadOffsets(3, 4).map((angleOffset) =>
      launchFromBarrel(params, new Explosive(20, 155, { color: '#b6ff9c', radius: 3 }), {
        angleOffset,
      }),
    ),
}
