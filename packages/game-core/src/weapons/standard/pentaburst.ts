import { Explosive } from '../behaviors/index.js'
import { launchFromBarrel, spreadOffsets } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const pentaburst: WeaponDefinition = {
  id: 'pentaburst',
  name: 'Pentaburst',
  description: 'Five shells in a wide fan. Hard to miss with.',
  rating: 4,
  traits: ['×5 shells'],
  launch: (params) =>
    spreadOffsets(5, 3.5).map((angleOffset) =>
      launchFromBarrel(params, new Explosive(18, 135, { color: '#7dffb0', radius: 3 }), {
        angleOffset,
      }),
    ),
}
