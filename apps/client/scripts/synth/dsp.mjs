/**
 * Tiny offline synthesizer: everything is a mono Float32Array at SAMPLE_RATE.
 * Deterministic (seeded noise), so re-running the script gives identical files.
 */
export const SAMPLE_RATE = 44100
const TAU = Math.PI * 2
/** Half a millisecond: enough to avoid a click, short enough to keep the attack. */
const FADE_IN_SAMPLES = 22

/** mulberry32 */
export const createRng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const midiToFreq = (note) => 440 * 2 ** ((note - 69) / 12)

const WAVES = {
  sine: (phase) => Math.sin(TAU * phase),
  square: (phase) => (phase % 1 < 0.5 ? 1 : -1),
  pulse: (phase) => (phase % 1 < 0.25 ? 1 : -1),
  saw: (phase) => 2 * (phase % 1) - 1,
  // Shifted a quarter cycle so it starts at zero (no click).
  triangle: (phase) => 1 - 4 * Math.abs(((phase + 0.25) % 1) - 0.5),
}

const resolve = (value, t, progress) => (typeof value === 'function' ? value(t, progress) : value)

/** `fn(seconds, progress 0–1)` evaluated for every sample. */
export const render = (seconds, fn) => {
  const out = new Float32Array(Math.max(1, Math.round(seconds * SAMPLE_RATE)))
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SAMPLE_RATE, i / out.length)
  return out
}

export const noise = (seconds, rng) => render(seconds, () => rng() * 2 - 1)

/** Oscillator whose frequency may change over time: a number or `(t, progress) => Hz`. */
export const osc = (seconds, freq, wave = 'sine') => {
  const shape = WAVES[wave]
  let phase = 0
  return render(seconds, (t, progress) => {
    phase += resolve(freq, t, progress) / SAMPLE_RATE
    return shape(phase)
  })
}

/** Exponential glide between two frequencies. */
export const glide =
  (from, to, curve = 1) =>
  (_, progress) =>
    from * (to / from) ** (progress ** curve)

/** Multiplies a signal by `fn(seconds, progress)`. */
export const shape = (input, fn) => {
  const out = new Float32Array(input.length)
  for (let i = 0; i < input.length; i++) {
    out[i] = input[i] * fn(i / SAMPLE_RATE, i / input.length)
  }
  return out
}

export const decay = (tau) => (t) => Math.exp(-t / tau)

/** Attack / hold / release envelope that always ends at zero. */
export const adsr = (attack, release) => (t, progress) => {
  const total = progress > 0 ? t / progress : attack + release
  const fadeIn = attack > 0 ? Math.min(1, t / attack) : 1
  const fadeOut = release > 0 ? Math.min(1, (total - t) / release) : 1
  return fadeIn * Math.max(0, fadeOut)
}

/** State-variable filter; `cutoff` is a number or `(t, progress) => Hz`. */
export const filter = (input, kind, cutoff, resonance = 0.7) => {
  const out = new Float32Array(input.length)
  let low = 0
  let band = 0
  for (let i = 0; i < input.length; i++) {
    const hz = Math.min(resolve(cutoff, i / SAMPLE_RATE, i / input.length), SAMPLE_RATE / 6.5)
    const f = 2 * Math.sin((Math.PI * hz) / SAMPLE_RATE)
    low += f * band
    const high = input[i] - low - resonance * band
    band += f * high
    out[i] = kind === 'low' ? low : kind === 'high' ? high : band
  }
  return out
}

/** Sums layers given as `[samples, gain?, offsetSeconds?]`. */
export const mix = (...layers) => {
  const length = Math.max(
    ...layers.map(([data, , offset = 0]) => Math.round(offset * SAMPLE_RATE) + data.length),
  )
  const out = new Float32Array(length)
  for (const [data, gain = 1, offset = 0] of layers) {
    const start = Math.round(offset * SAMPLE_RATE)
    for (let i = 0; i < data.length; i++) out[start + i] += data[i] * gain
  }
  return out
}

/** Soft-clips, removes clicks at the edges and normalises to `peak`. */
export const finish = (input, { drive = 1, peak = 0.9, fade = 0.004, loop = false } = {}) => {
  const out = new Float32Array(input.length)
  let max = 0
  for (let i = 0; i < input.length; i++) {
    out[i] = Math.tanh(input[i] * drive)
    max = Math.max(max, Math.abs(out[i]))
  }
  const fadeSamples = loop ? 0 : Math.round(fade * SAMPLE_RATE)
  for (let i = 0; i < out.length; i++) {
    const fadeIn = loop ? 1 : Math.min(1, i / FADE_IN_SAMPLES)
    const edge = fadeIn * (fadeSamples ? Math.min(1, (out.length - 1 - i) / fadeSamples) : 1)
    out[i] *= (peak / (max || 1)) * edge
  }
  return out
}

/**
 * Rounds a sound off: rolls off the harsh highs, eases the attack in over a few milliseconds
 * and leaves headroom. Applied to every effect so nothing is sharp on the ear.
 */
export const soften = (input, { cutoff = 3000, attack = 0.004, peak = 0.7 } = {}) => {
  const rounded = shape(filter(filter(input, 'low', cutoff, 1.2), 'low', cutoff * 1.5, 1.2), (t) =>
    Math.min(1, t / attack),
  )
  return finish(rounded, { peak, fade: 0.02 })
}

/** A canvas to place notes on. Looping tracks wrap tails around so the loop is seamless. */
export class Track {
  constructor(seconds, loop) {
    this.data = new Float32Array(Math.round(seconds * SAMPLE_RATE))
    this.loop = loop
  }

  add(startSeconds, samples, gain = 1) {
    const length = this.data.length
    const start = Math.round(startSeconds * SAMPLE_RATE)
    for (let i = 0; i < samples.length; i++) {
      let index = start + i
      if (index >= length) {
        if (!this.loop) break
        index %= length
      }
      this.data[index] += samples[i] * gain
    }
  }

  /** Feedback-style echo built from discrete taps. */
  echo(delaySeconds, feedback, taps = 3) {
    const dry = this.data.slice()
    for (let tap = 1; tap <= taps; tap++) this.add(delaySeconds * tap, dry, feedback ** tap)
  }

  merge(other, gain = 1) {
    this.add(0, other.data, gain)
  }
}

/** 16-bit mono PCM. */
export const encodeWav = (samples) => {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2)
  }
  return buffer
}
