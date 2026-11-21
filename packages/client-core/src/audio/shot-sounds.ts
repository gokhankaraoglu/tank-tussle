import type { ShotEvent, SignalKind, WeaponId } from '@tank-tussle/game-core'
import type { EffectOptions } from './audio-service.js'
import type { EffectId } from './sound-catalog.js'

/** Optional per-weapon overrides; anything missing falls back to the defaults below. */
interface WeaponSounds {
  readonly launch?: EffectId
  readonly explosion?: EffectId
  readonly split?: EffectId
  readonly bounce?: EffectId
  /** A tank changing place because of this weapon. */
  readonly moved?: EffectId
}

/** Add a weapon here only if it should sound special; the rest fall back to the defaults. */
const WEAPON_SOUNDS: Readonly<Record<WeaponId, WeaponSounds>> = {
  peashooter: { explosion: 'explosionMedium2' },
  thumper: { launch: 'launchHeavy', explosion: 'explosionLarge' },
  needle: { launch: 'zap', explosion: 'explosionSmall' },
  bloodhound: { launch: 'lockOn' },
  popcorn: { explosion: 'popcorn' },
  confetti: { explosion: 'explosionSmall2' },
  sparkler: { explosion: 'sparkler' },
  'meteor-shower': { split: 'meteors', explosion: 'explosionSmall' },
  domino: { explosion: 'explosionSmall' },
  mole: { explosion: 'explosionMedium' },
  woodpecker: { launch: 'gunshot', explosion: 'explosionSmall2' },
  warp: { launch: 'zap', moved: 'warp' },
  shockwave: { launch: 'launchHeavy', explosion: 'shockwave' },
  leech: { explosion: 'explosionMedium2' },
  'sky-hammer': { split: 'fallingBomb' },
}

const explosionBySize = (radius: number): EffectId => {
  if (radius < 16) return 'explosionSmall'
  if (radius < 30) return 'explosionMedium'
  return radius < 50 ? 'explosionLarge' : 'explosionHuge'
}

const SIGNAL_SOUNDS = {
  bounce: (sounds: WeaponSounds): SoundCue => ({
    id: sounds.bounce ?? 'bounce',
    options: { volume: 0.7 },
  }),
  split: (sounds: WeaponSounds): SoundCue => ({
    id: sounds.split ?? 'split',
    options: { volume: 0.6 },
  }),
  build: (): SoundCue => ({ id: 'wall' }),
} satisfies Record<SignalKind, (sounds: WeaponSounds) => SoundCue>

export interface SoundCue {
  readonly id: EffectId
  readonly options?: EffectOptions
}

type CueRule<K extends ShotEvent['kind']> = (
  event: Extract<ShotEvent, { kind: K }>,
  sounds: WeaponSounds,
) => SoundCue | null

/** One rule per event kind; the compiler makes sure new event kinds get a rule. */
const CUE_RULES: { readonly [K in ShotEvent['kind']]: CueRule<K> } = {
  launch: (_, sounds) => ({ id: sounds.launch ?? 'launch', options: { volume: 0.6 } }),
  explosion: (event, sounds) => ({ id: sounds.explosion ?? explosionBySize(event.radius) }),
  dirt: (event) => ({ id: event.radius > 40 ? 'landslide' : 'dirt' }),
  signal: (event, sounds) => SIGNAL_SOUNDS[event.signal](sounds),
  'tank-moved': (_, sounds) => ({ id: sounds.moved ?? 'shove', options: { volume: 0.8 } }),
  steal: () => ({ id: 'steal' }),
  terrain: () => null,
  damage: () => null,
}

/** Decides what a shot event sounds like for a given weapon, or null if it is silent. */
export const soundForEvent = (event: ShotEvent, weaponId: WeaponId): SoundCue | null => {
  // TypeScript cannot correlate `event.kind` with the rule's parameter type, hence the cast.
  const rule = CUE_RULES[event.kind] as CueRule<ShotEvent['kind']>
  return rule(event, WEAPON_SOUNDS[weaponId] ?? {})
}
