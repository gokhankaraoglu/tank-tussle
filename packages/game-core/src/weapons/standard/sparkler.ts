import { ClusterOnImpact, Explosive } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

const spark = { color: '#ff5e5e', radius: 2 }

export const sparkler: WeaponDefinition = {
  id: 'sparkler',
  name: 'Sparkler',
  description: 'A carpet of tiny explosions around the impact.',
  rating: 2,
  traits: ['Cluster ×14'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new ClusterOnImpact(
        { count: 14, speed: 110, fan: 160, createChild: () => new Explosive(10, 35, spark) },
        { color: '#ff3d3d', radius: 4 },
      ),
    ),
  ],
}
