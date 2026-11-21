import { ClusterOnImpact, Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

const pellet = { color: '#ffb36b', radius: 2 }

export const confetti: WeaponDefinition = {
  id: 'confetti',
  name: 'Confetti',
  description: 'Sprays ten pellets over a wide area.',
  rating: 3,
  traits: ['Cluster ×10'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new ClusterOnImpact(
        { count: 10, speed: 300, fan: 150, createChild: () => new Explosive(13, 60, pellet) },
        { color: '#ff9f43', radius: 4 },
      ),
    ),
  ],
}
