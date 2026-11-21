import { Teleport } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

export const warp: WeaponDefinition = {
  id: 'warp',
  name: 'Warp',
  description: 'No damage: your tank teleports to where the shell lands.',
  rating: 2,
  traits: ['Teleports you'],
  launch: (params) => [launchFromBarrel(params, new Teleport({ color: '#7df9ff', radius: 4 }))],
}
