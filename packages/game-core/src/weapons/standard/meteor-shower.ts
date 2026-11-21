import { Explosive, SplitAtApex } from '../behaviors/index.js'
import { launchFromBarrel } from '../launch.js'
import type { WeaponDefinition } from '../types.js'

const meteor = { color: '#d6f1ff', radius: 2 }

export const meteorShower: WeaponDefinition = {
  id: 'meteor-shower',
  name: 'Meteor Shower',
  description: 'Splits into nine meteors at the top of its arc.',
  rating: 4,
  traits: ['Splits ×9'],
  launch: (params) => [
    launchFromBarrel(
      params,
      new SplitAtApex(new Explosive(16, 90, meteor), 9, 30, () => new Explosive(15, 90, meteor)),
    ),
  ],
}
