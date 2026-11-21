import { ClusterOnImpact, Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

const kernel = { color: '#ffe066', radius: 2 }

export const popcorn: WeaponDefinition = {
  id: 'popcorn',
  name: 'Popcorn',
  description: 'Pops into six bomblets on impact.',
  rating: 4,
  traits: ['Cluster ×6'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new ClusterOnImpact(
        {
          count: 6,
          speed: 200,
          fan: 100,
          blast: { radius: 20, damage: 85 },
          createChild: () => new Explosive(18, 65, kernel),
        },
        { color: '#f2c94c', radius: 5 },
      ),
    ),
  ],
}
