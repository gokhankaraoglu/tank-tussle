import { ChainReaction } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const domino: WeaponDefinition = {
  id: 'domino',
  name: 'Domino',
  description: 'Sets off a row of explosions in the direction of travel.',
  rating: 4,
  traits: ['Chain ×6'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new ChainReaction(
        { links: 6, spacing: 26, delayTicks: 7, radius: 20, damage: 190 },
        { color: '#ff6bd5', radius: 4 },
      ),
    ),
  ],
}
