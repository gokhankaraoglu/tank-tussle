import {
  adsr,
  createRng,
  decay,
  filter,
  finish,
  glide,
  mix,
  noise,
  osc,
  render,
  shape,
} from './dsp.mjs'

const hump = (_, progress) => Math.sin(Math.PI * progress)

/** Filtered noise that darkens as it fades over a pitch-dropping thump: a soft "whump". */
const explosion = ({ seconds, seed, bright = 2600, sub = 90, drive = 1.8 }) => {
  const rng = createRng(seed)
  const rumble = shape(
    filter(noise(seconds, rng), 'low', (_, p) => 70 + bright * 0.45 * Math.exp(-p * 7)),
    (t, p) => Math.exp(-t / (seconds * 0.28)) * (1 - p),
  )
  const thump = shape(
    osc(seconds, (t) => sub * Math.exp(-t * 9) + 34),
    decay(seconds * 0.22),
  )
  const crack = shape(filter(noise(0.07, rng), 'high', 1700), decay(0.012))
  return finish(mix([rumble, 0.8], [thump, 1], [crack, 0.08]), { drive: drive * 0.55 })
}

const pop = (rng, from = 700) =>
  mix(
    [shape(osc(0.06, glide(from, 140)), decay(0.016)), 1],
    [shape(filter(noise(0.09, rng), 'low', glide(1400, 250)), decay(0.022)), 0.4],
  )

/** Several copies of a small sound scattered over time. */
const scatter = ({ seconds, seed, count, make, spread = 1 }) => {
  const rng = createRng(seed)
  const layers = Array.from({ length: count }, (_, index) => {
    const at = ((index + rng() * spread) / count) * seconds
    return [make(rng, index), 0.5 + rng() * 0.5, at]
  })
  return finish(mix(...layers), { drive: 0.9 })
}

const click = () => finish(mix([shape(osc(0.05, glide(820, 560)), decay(0.012)), 1]), { peak: 0.7 })

const launch = ({ seed, low = 190, seconds = 0.28 }) => {
  const rng = createRng(seed)
  return finish(
    mix(
      [shape(osc(seconds, glide(low, 48)), decay(seconds * 0.3)), 1],
      [shape(filter(noise(seconds, rng), 'low', glide(900, 150)), decay(seconds * 0.22)), 0.6],
      [shape(filter(noise(seconds, rng), 'high', 2500), (t, p) => hump(t, p) * 0.5), 0.05],
    ),
    { drive: 1 },
  )
}

const zap = () =>
  finish(
    filter(
      mix(
        [shape(osc(0.24, glide(1500, 160, 0.6), 'triangle'), adsr(0.006, 0.14)), 0.8],
        [shape(osc(0.24, glide(750, 80, 0.6), 'sine'), adsr(0.006, 0.16)), 0.5],
      ),
      'low',
      2600,
    ),
    { drive: 1 },
  )

const gunshot = () => {
  const rng = createRng(31)
  return finish(
    mix(
      [shape(filter(noise(0.1, rng), 'band', 1100, 0.9), decay(0.018)), 0.6],
      [shape(osc(0.08, glide(330, 80)), decay(0.02)), 0.9],
    ),
    { drive: 1 },
  )
}

const beeps = (notes, each = 0.08, wave = 'sine') =>
  finish(
    mix(
      ...notes.map((freq, index) => [
        shape(osc(each, freq, wave), adsr(0.012, 0.04)),
        1,
        index * each * 1.15,
      ]),
    ),
    { peak: 0.75 },
  )

const boing = () =>
  finish(
    shape(
      osc(0.26, (t) => 170 + 430 * Math.exp(-t * 13) * (1 + 0.25 * Math.sin(t * 70)), 'triangle'),
      decay(0.08),
    ),
  )

const whoosh = ({ seed, seconds = 0.36, from = 500, peakHz = 2200, to = 400 }) => {
  const rng = createRng(seed)
  const centre = (_, p) =>
    p < 0.5 ? from + (peakHz - from) * p * 2 : peakHz + (to - peakHz) * (p - 0.5) * 2
  return finish(shape(filter(noise(seconds, rng), 'band', centre, 0.8), hump), { drive: 1 })
}

const split = () => {
  const rng = createRng(77)
  return finish(mix([pop(rng, 900), 1], [whoosh({ seed: 78, seconds: 0.3 }), 0.7, 0.02]))
}

const whistles = ({ count, seconds, from, to, stagger, seed }) => {
  const rng = createRng(seed)
  const layers = Array.from({ length: count }, (_, index) => {
    const tune = 1 + (rng() - 0.5) * 0.25
    const tone = osc(seconds, glide(from * tune, to * tune, 1.4))
    return [shape(tone, (t, p) => hump(t, p) ** 0.6), 0.6, index * stagger]
  })
  const hiss = shape(filter(noise(seconds + count * stagger, rng), 'band', 1800, 0.8), hump)
  return finish(mix(...layers, [hiss, 0.06]), { peak: 0.8 })
}

const fallingBomb = () =>
  finish(
    shape(
      osc(0.95, (t, p) => 1300 * (420 / 1300) ** (p ** 1.3) * (1 + 0.012 * Math.sin(t * 38))),
      (_, p) => Math.min(1, p * 5) * (0.35 + 0.65 * p) * Math.min(1, (1 - p) * 25),
    ),
    { peak: 0.75 },
  )

const thud = ({ seed, seconds = 0.28, cutoff = 420 }) => {
  const rng = createRng(seed)
  return finish(
    mix(
      [shape(filter(noise(seconds, rng), 'low', cutoff), decay(seconds * 0.25)), 1],
      [shape(osc(seconds, glide(95, 45)), decay(seconds * 0.3)), 0.8],
    ),
    { drive: 1.1 },
  )
}

const rumble = ({ seed, seconds, rising = false }) => {
  const rng = createRng(seed)
  const gravel = render(seconds, () => (rng() < 0.004 ? rng() * 2 - 1 : 0))
  const body = filter(noise(seconds, rng), 'low', 320)
  const envelope = (t, p) =>
    (rising ? p ** 0.7 * Math.min(1, (1 - p) * 12) : hump(t, p) ** 0.5) *
    (0.75 + 0.25 * Math.sin(t * 46))
  return finish(
    mix(
      [shape(body, envelope), 1],
      [shape(filter(gravel, 'band', 900, 0.6), envelope), 1],
      [shape(osc(seconds, rising ? glide(55, 130) : 60), envelope), 0.5],
    ),
    { drive: 1 },
  )
}

const warp = () => {
  const notes = [262, 330, 392, 523, 659, 784]
  const shimmer = notes.map((freq, index) => [
    shape(
      osc(0.34, (t) => freq * (1 + 0.01 * Math.sin(t * 45))),
      (t, p) => hump(t, p) * (0.7 + 0.3 * Math.sin(t * 60)),
    ),
    0.5,
    index * 0.055,
  ])
  return finish(
    mix(...shimmer, [whoosh({ seed: 5, seconds: 0.6, from: 300, peakHz: 2000, to: 1200 }), 0.25]),
    {
      peak: 0.8,
    },
  )
}

const shockwave = () =>
  finish(
    mix(
      [explosion({ seconds: 1.7, seed: 61, bright: 1800, sub: 75, drive: 2.2 }), 1],
      [
        shape(
          filter(osc(1.2, glide(300, 38, 0.5), 'triangle'), 'low', glide(900, 120)),
          (t, p) => (1 - p) * (0.6 + 0.4 * Math.sin(t * 52)),
        ),
        0.4,
      ],
    ),
    { drive: 1 },
  )

const steal = () => {
  const drain = [990, 740, 555].map((freq, index) => [
    shape(osc(0.06, glide(freq, freq * 0.8), 'sine'), adsr(0.008, 0.03)),
    0.5,
    index * 0.055,
  ])
  const coins = [784, 1047].map((freq, index) => [
    shape(mix([osc(0.4, freq), 1], [osc(0.4, freq * 2.01), 0.3]), decay(0.11)),
    0.7,
    0.2 + index * 0.085,
  ])
  return finish(mix(...drain, ...coins), { peak: 0.8 })
}

/** Every effect file: `id → samples`. The ids are the file names under `public/sounds`. */
export const EFFECT_FILES = {
  'ui/click': click,
  'sfx/launch': () => launch({ seed: 11 }),
  'sfx/launch-heavy': () => launch({ seed: 12, low: 130, seconds: 0.42 }),
  'sfx/zap': zap,
  'sfx/gunshot': gunshot,
  'sfx/lock-on': () => beeps([660, 660, 990]),
  'sfx/bounce': boing,
  'sfx/split': split,
  'sfx/meteors': () =>
    whistles({ count: 5, seconds: 0.55, from: 1500, to: 520, stagger: 0.08, seed: 21 }),
  'sfx/falling-bomb': fallingBomb,
  'sfx/explosion-small': () => explosion({ seconds: 0.38, seed: 1, bright: 3600, sub: 150 }),
  'sfx/explosion-small-2': () => explosion({ seconds: 0.44, seed: 2, bright: 2900, sub: 125 }),
  'sfx/explosion-medium': () => explosion({ seconds: 0.75, seed: 3, bright: 2700, sub: 105 }),
  'sfx/explosion-medium-2': () => explosion({ seconds: 0.85, seed: 4, bright: 2200, sub: 95 }),
  'sfx/explosion-large': () =>
    explosion({ seconds: 1.35, seed: 5, bright: 2400, sub: 85, drive: 2.1 }),
  'sfx/explosion-huge': () =>
    explosion({ seconds: 2.1, seed: 6, bright: 2000, sub: 70, drive: 2.5 }),
  'sfx/popcorn': () =>
    scatter({ seconds: 0.5, seed: 41, count: 6, make: (rng) => pop(rng, 500 + rng() * 500) }),
  'sfx/sparkler': () =>
    scatter({
      seconds: 0.8,
      seed: 42,
      count: 34,
      make: (rng) =>
        shape(filter(noise(0.04, rng), 'band', 1200 + rng() * 1400, 0.7), decay(0.009)),
    }),
  'sfx/dirt': () => thud({ seed: 51 }),
  'sfx/landslide': () => rumble({ seed: 52, seconds: 1.25 }),
  'sfx/wall': () =>
    finish(
      mix(
        [rumble({ seed: 53, seconds: 0.8, rising: true }), 1],
        [thud({ seed: 54, cutoff: 300 }), 0.9, 0.72],
      ),
    ),
  'sfx/warp': warp,
  'sfx/shove': () => whoosh({ seed: 55, seconds: 0.42, from: 250, peakHz: 1500, to: 250 }),
  'sfx/shockwave': shockwave,
  'sfx/steal': steal,
}
