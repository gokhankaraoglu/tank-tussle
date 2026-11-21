import { Leeching } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const leech: WeaponDefinition = {
  id: 'leech',
  name: 'Leech',
  description: "Scores, then steals half of what it earned from the enemy's points.",
  rating: 5,
  traits: ['Steals points'],
  launch: (params) => [
    launchFromBarrel(params, new Leeching(32, 230, 0.5, { color: '#b6ff3d', radius: 4 })),
  ],
}
