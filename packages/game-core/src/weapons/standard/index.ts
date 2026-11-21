import type { WeaponDefinition } from '../types.js'
import { bloodhound } from './bloodhound.js'
import { confetti } from './confetti.js'
import { domino } from './domino.js'
import { leech } from './leech.js'
import { meteorShower } from './meteor-shower.js'
import { mole } from './mole.js'
import { mudslide } from './mudslide.js'
import { needle } from './needle.js'
import { peashooter } from './peashooter.js'
import { pentaburst } from './pentaburst.js'
import { popcorn } from './popcorn.js'
import { rampart } from './rampart.js'
import { shockwave } from './shockwave.js'
import { skipstone } from './skipstone.js'
import { skyHammer } from './sky-hammer.js'
import { sparkler } from './sparkler.js'
import { thumper } from './thumper.js'
import { trident } from './trident.js'
import { warp } from './warp.js'
import { woodpecker } from './woodpecker.js'

/** The standard weapon pack. Add a weapon by creating a file and listing it here. */
export const STANDARD_WEAPONS: readonly WeaponDefinition[] = [
  peashooter,
  thumper,
  trident,
  pentaburst,
  needle,
  bloodhound,
  skipstone,
  popcorn,
  confetti,
  sparkler,
  meteorShower,
  domino,
  mudslide,
  mole,
  woodpecker,
  warp,
  shockwave,
  leech,
  skyHammer,
  rampart,
]
