import { Airstrike, Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

const bomb = { color: '#ffd166', radius: 3 }

export const skyHammer: WeaponDefinition = {
  id: 'sky-hammer',
  name: 'Sky Hammer',
  description: 'Marks a spot; five bombs then fall straight down from the sky.',
  rating: 4,
  traits: ['Airstrike ×5'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new Airstrike(
        {
          bombs: 5,
          spacing: 22,
          ticksBetweenBombs: 6,
          createBomb: () => new Explosive(20, 112, bomb),
        },
        { color: '#ff9f1c', radius: 3 },
      ),
    ),
  ],
}
