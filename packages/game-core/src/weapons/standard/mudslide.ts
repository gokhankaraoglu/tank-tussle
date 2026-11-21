import { DirtBomb } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const mudslide: WeaponDefinition = {
  id: 'mudslide',
  name: 'Mudslide',
  description: 'Drops a huge ball of loose dirt. Scores by burying the enemy.',
  rating: 1,
  traits: ['Buries'],
  launch: (params) => [
    launchFromBarrel(params, new DirtBomb(60, 130, { color: '#b07a4a', radius: 6 })),
  ],
}
