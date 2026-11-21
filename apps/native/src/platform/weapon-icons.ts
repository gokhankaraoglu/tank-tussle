import type { WeaponId } from '@tank-tussle/game-core'

/** The web client's SVG weapon icons, bundled into the app. */
export const WEAPON_ICONS: Readonly<Record<WeaponId, number>> = {
  peashooter: require('../../../client/public/weapons/peashooter.svg'),
  thumper: require('../../../client/public/weapons/thumper.svg'),
  trident: require('../../../client/public/weapons/trident.svg'),
  pentaburst: require('../../../client/public/weapons/pentaburst.svg'),
  needle: require('../../../client/public/weapons/needle.svg'),
  bloodhound: require('../../../client/public/weapons/bloodhound.svg'),
  skipstone: require('../../../client/public/weapons/skipstone.svg'),
  popcorn: require('../../../client/public/weapons/popcorn.svg'),
  confetti: require('../../../client/public/weapons/confetti.svg'),
  sparkler: require('../../../client/public/weapons/sparkler.svg'),
  'meteor-shower': require('../../../client/public/weapons/meteor-shower.svg'),
  domino: require('../../../client/public/weapons/domino.svg'),
  mudslide: require('../../../client/public/weapons/mudslide.svg'),
  mole: require('../../../client/public/weapons/mole.svg'),
  woodpecker: require('../../../client/public/weapons/woodpecker.svg'),
  warp: require('../../../client/public/weapons/warp.svg'),
  shockwave: require('../../../client/public/weapons/shockwave.svg'),
  leech: require('../../../client/public/weapons/leech.svg'),
  'sky-hammer': require('../../../client/public/weapons/sky-hammer.svg'),
  rampart: require('../../../client/public/weapons/rampart.svg'),
}
