import type { EffectId, MusicTrack } from '@tank-tussle/client-core'

/**
 * Metro needs every asset as a literal `require`, so the catalog is spelled out here. The files
 * are the web client's generated sounds (`npm run sounds -w @tank-tussle/client`).
 */
export const EFFECT_ASSETS: Record<EffectId, number> = {
  click: require('../../../client/public/sounds/ui/click.wav'),
  launch: require('../../../client/public/sounds/sfx/launch.wav'),
  launchHeavy: require('../../../client/public/sounds/sfx/launch-heavy.wav'),
  zap: require('../../../client/public/sounds/sfx/zap.wav'),
  gunshot: require('../../../client/public/sounds/sfx/gunshot.wav'),
  lockOn: require('../../../client/public/sounds/sfx/lock-on.wav'),
  bounce: require('../../../client/public/sounds/sfx/bounce.wav'),
  split: require('../../../client/public/sounds/sfx/split.wav'),
  meteors: require('../../../client/public/sounds/sfx/meteors.wav'),
  fallingBomb: require('../../../client/public/sounds/sfx/falling-bomb.wav'),
  explosionSmall: require('../../../client/public/sounds/sfx/explosion-small.wav'),
  explosionSmall2: require('../../../client/public/sounds/sfx/explosion-small-2.wav'),
  explosionMedium: require('../../../client/public/sounds/sfx/explosion-medium.wav'),
  explosionMedium2: require('../../../client/public/sounds/sfx/explosion-medium-2.wav'),
  explosionLarge: require('../../../client/public/sounds/sfx/explosion-large.wav'),
  explosionHuge: require('../../../client/public/sounds/sfx/explosion-huge.wav'),
  popcorn: require('../../../client/public/sounds/sfx/popcorn.wav'),
  sparkler: require('../../../client/public/sounds/sfx/sparkler.wav'),
  dirt: require('../../../client/public/sounds/sfx/dirt.wav'),
  landslide: require('../../../client/public/sounds/sfx/landslide.wav'),
  wall: require('../../../client/public/sounds/sfx/wall.wav'),
  warp: require('../../../client/public/sounds/sfx/warp.wav'),
  shove: require('../../../client/public/sounds/sfx/shove.wav'),
  shockwave: require('../../../client/public/sounds/sfx/shockwave.wav'),
  steal: require('../../../client/public/sounds/sfx/steal.wav'),
}

export const MUSIC_ASSETS: Record<MusicTrack, number> = {
  menu: require('../../../client/public/sounds/music/menu.m4a'),
  waiting: require('../../../client/public/sounds/music/waiting.m4a'),
  battle: require('../../../client/public/sounds/music/battle.m4a'),
  victory: require('../../../client/public/sounds/music/victory.m4a'),
}
