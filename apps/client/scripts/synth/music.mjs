import {
  Track,
  adsr,
  createRng,
  decay,
  filter,
  finish,
  glide,
  midiToFreq,
  mix,
  noise,
  osc,
  shape,
} from './dsp.mjs'

// ---- Instruments: (midi note, seconds) → samples -------------------------------------------

const vibrato =
  (freq, depth = 0.006, rate = 5.5) =>
  (t) =>
    freq * (1 + depth * Math.sin(t * rate * 2 * Math.PI) * Math.min(1, t / 0.25))

const lead = (note, seconds) =>
  shape(
    filter(
      mix(
        [osc(seconds + 0.15, vibrato(midiToFreq(note)), 'triangle'), 1],
        [osc(seconds + 0.15, vibrato(midiToFreq(note))), 0.6],
      ),
      'low',
      1800,
    ),
    adsr(0.035, 0.15),
  )

const pluck = (note, seconds) =>
  shape(
    filter(osc(seconds + 0.1, midiToFreq(note), 'triangle'), 'low', glide(1900, 500)),
    (t, p) => Math.min(1, t / 0.008) * Math.exp(-t / 0.16) * (1 - p),
  )

const bass = (note, seconds) => {
  const freq = midiToFreq(note)
  const body = mix(
    [osc(seconds + 0.04, freq, 'triangle'), 1],
    [osc(seconds + 0.04, freq, 'saw'), 0.08],
  )
  return shape(filter(body, 'low', 420), adsr(0.015, 0.08))
}

const pad = (notes, seconds) =>
  shape(
    filter(
      mix(
        ...notes.flatMap((note) => [
          [osc(seconds + 0.6, midiToFreq(note) * 1.004, 'saw'), 1],
          [osc(seconds + 0.6, midiToFreq(note) * 0.996, 'saw'), 1],
        ]),
      ),
      'low',
      1000,
    ),
    adsr(0.35, 0.6),
  )

const electricPiano = (note, seconds) => {
  const freq = midiToFreq(note)
  const tone = mix(
    [osc(seconds + 0.4, freq), 1],
    [osc(seconds + 0.4, freq * 2), 0.28],
    [shape(osc(seconds + 0.4, freq * 4), decay(0.08)), 0.18],
  )
  return shape(tone, (t, p) => Math.exp(-t / 0.9) * Math.min(1, t / 0.004) * (1 - p ** 3))
}

const bell = (note, seconds) => {
  const freq = midiToFreq(note)
  const tone = mix(
    [osc(seconds + 0.7, freq), 1],
    [shape(osc(seconds + 0.7, freq * 2.76), decay(0.12)), 0.35],
    [shape(osc(seconds + 0.7, freq * 5.4), decay(0.05)), 0.2],
  )
  return shape(tone, (t, p) => Math.exp(-t / 0.45) * (1 - p))
}

const woodblock = (note) => shape(osc(0.06, midiToFreq(note)), decay(0.012))

/** Drums sit well behind the melody: brushed rather than hit. */
const DRUM_LEVEL = 0.55

const createDrums = (seed) => {
  const rng = createRng(seed)
  return {
    kick: () =>
      shape(
        osc(0.22, glide(105, 44, 0.5)),
        (t) => Math.min(1, t / 0.004) * Math.exp(-t / 0.07) * DRUM_LEVEL,
      ),
    snare: () =>
      mix(
        [shape(filter(noise(0.18, rng), 'band', 1100, 0.9), decay(0.05)), DRUM_LEVEL],
        [shape(osc(0.1, glide(200, 140)), decay(0.03)), 0.3 * DRUM_LEVEL],
      ),
    hat: () =>
      shape(filter(noise(0.05, rng), 'band', 4200, 0.9), (t) => Math.exp(-t / 0.014) * DRUM_LEVEL),
    rim: () => shape(filter(noise(0.04, rng), 'band', 1700, 0.5), decay(0.01)),
  }
}

// ---- Sequencing ----------------------------------------------------------------------------

/** A song is a grid of beats; parts place notes on it with `at(beat)`. */
const createSong = ({ bpm, beats, loop }) => {
  const beat = 60 / bpm
  const track = new Track(beats * beat, loop)
  const part = () => new Track(beats * beat, loop)
  const play = (target, startBeat, samples, gain = 1) => target.add(startBeat * beat, samples, gain)
  /** `notes`: `[startBeat, lengthBeats, midi]`, relative to `offset`. */
  const melody = (target, instrument, notes, offset = 0, gain = 1, transpose = 0) => {
    for (const [start, length, note] of notes) {
      play(target, offset + start, instrument(note + transpose, length * beat), gain)
    }
  }
  return { beat, track, part, play, melody }
}

/** Rolls off the top end and leaves headroom so the mix stays warm and unobtrusive. */
const master = (track, loop) =>
  finish(filter(track.data, 'low', 5200, 1.2), { drive: 0.9, peak: 0.75, loop })

// ---- Menu: calm and warm, D minor, 84 bpm ------------------------------------------------

const MENU_CHORDS = [
  [50, 57, 62, 65], // Dm
  [46, 58, 62, 65], // Bb
  [41, 57, 60, 65], // F
  [48, 55, 60, 64], // C
  [50, 57, 62, 65], // Dm
  [46, 58, 62, 65], // Bb
  [43, 58, 62, 67], // Gm
  [45, 57, 61, 64], // A
]

/** Two bars per chord. */
const MENU_MELODY = [
  [
    [0, 2, 69],
    [2, 1, 74],
    [3, 1, 77],
    [4, 1.5, 76],
    [5.5, 0.5, 74],
    [6, 2, 69],
  ],
  [
    [0, 2, 70],
    [2, 1, 74],
    [3, 1, 77],
    [4, 1.5, 79],
    [5.5, 0.5, 77],
    [6, 2, 74],
  ],
  [
    [0, 2, 72],
    [2, 1, 77],
    [3, 1, 81],
    [4, 1.5, 79],
    [5.5, 0.5, 77],
    [6, 2, 72],
  ],
  [
    [0, 2, 76],
    [2, 1, 79],
    [3, 1, 76],
    [4, 1.5, 74],
    [5.5, 0.5, 72],
    [6, 2, 76],
  ],
  [
    [0, 1, 77],
    [1, 1, 76],
    [2, 1, 74],
    [3, 1, 69],
    [4, 3, 74],
  ],
  [
    [0, 1, 74],
    [1, 1, 77],
    [2, 1, 82],
    [3, 1, 81],
    [4, 3, 77],
  ],
  [
    [0, 1, 79],
    [1, 1, 82],
    [2, 1, 81],
    [3, 1, 79],
    [4, 2, 74],
    [6, 2, 79],
  ],
  [
    [0, 1.5, 81],
    [1.5, 0.5, 79],
    [2, 1, 76],
    [3, 1, 73],
    [4, 2, 69],
    [6, 1, 76],
    [7, 1, 81],
  ],
]

const menu = () => {
  const song = createSong({ bpm: 84, beats: 64, loop: true })
  const drums = createDrums(101)
  const melodic = song.part()

  MENU_CHORDS.forEach((chord, index) => {
    const start = index * 8
    const [root, ...upper] = chord
    song.play(song.track, start, pad(upper, 8 * song.beat), 0.11)
    for (const offset of [0, 1.5, 2, 3.5, 4, 5.5, 6, 7]) {
      song.play(
        song.track,
        start + offset,
        bass(root - (offset === 7 ? -7 : 0), 0.45 * song.beat),
        0.5,
      )
    }
    const tones = [...upper, upper[0] + 12, upper[1] + 12]
    for (let step = 0; step < 16; step++) {
      const note = tones[[0, 1, 2, 3, 4, 3, 2, 1][step % 8]]
      song.play(melodic, start + step * 0.5, pluck(note + 12, 0.3 * song.beat), 0.16)
    }
    const voice = index < 4 ? bell : lead
    song.melody(melodic, voice, MENU_MELODY[index], start, index < 4 ? 0.3 : 0.2)

    for (let bar = 0; bar < 2; bar++) {
      const at = start + bar * 4
      song.play(song.track, at, drums.kick(), 0.7)
      song.play(song.track, at + 2.5, drums.kick(), 0.5)
      if (index >= 2) {
        song.play(song.track, at + 1, drums.snare(), 0.28)
        song.play(song.track, at + 3, drums.snare(), 0.28)
      }
      for (let eighth = 0; eighth < 8; eighth++) {
        song.play(song.track, at + eighth * 0.5, drums.hat(), eighth % 2 ? 0.07 : 0.12)
      }
    }
  })

  melodic.echo(0.75 * song.beat, 0.35)
  song.track.merge(melodic)
  return master(song.track, true)
}

// ---- Waiting room / weapon shop: laid-back, C major, 72 bpm --------------------------------

const WAITING_CHORDS = [
  [36, 52, 55, 59, 62], // Cmaj9
  [33, 52, 55, 60, 64], // Am7
  [38, 53, 57, 60, 64], // Dm9
  [31, 53, 57, 59, 62], // G13
  [40, 52, 55, 59, 62], // Em7
  [33, 52, 55, 61, 64], // A7
  [38, 53, 57, 60, 65], // Dm7
  [31, 53, 55, 59, 65], // G7
]

/** One bar per chord. */
const WAITING_MELODY = [
  [
    [2, 1, 76],
    [3, 1, 79],
  ],
  [
    [0, 2.5, 81],
    [3, 0.5, 79],
  ],
  [
    [1.5, 0.5, 77],
    [2, 1, 76],
    [3, 1, 74],
  ],
  [[0, 3, 71]],
  [
    [2, 1, 79],
    [3, 1, 83],
  ],
  [
    [0, 2, 81],
    [2.5, 0.5, 73],
    [3, 1, 76],
  ],
  [
    [0, 1, 77],
    [1, 1, 81],
    [2, 2, 84],
  ],
  [
    [0, 1, 74],
    [1, 1, 71],
    [2, 2, 67],
  ],
]

const waiting = () => {
  const song = createSong({ bpm: 72, beats: 32, loop: true })
  const drums = createDrums(202)
  const melodic = song.part()
  const swing = 0.62

  WAITING_CHORDS.forEach((chord, bar) => {
    const start = bar * 4
    const [root, ...upper] = chord
    for (const [offset, gain] of [
      [0, 0.2],
      [1 + swing, 0.13],
      [3, 0.1],
    ]) {
      upper.forEach((note, voice) => {
        song.play(
          song.track,
          start + offset + voice * 0.012,
          electricPiano(note, 1.6 * song.beat),
          gain,
        )
      })
    }
    song.play(song.track, start, bass(root, 1.4 * song.beat), 0.55)
    song.play(song.track, start + 2, bass(root + 7, 0.9 * song.beat), 0.4)
    song.play(song.track, start + 3 + swing, bass(root + (bar % 2 ? 2 : -1), 0.3 * song.beat), 0.35)
    song.melody(melodic, bell, WAITING_MELODY[bar], start, 0.26)

    for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
      const at = start + beatIndex
      // The "clock": a quiet tick-tock that makes the loop feel like waiting.
      song.play(song.track, at, woodblock(beatIndex % 2 ? 79 : 84), 0.1)
      song.play(song.track, at, drums.hat(), 0.09)
      song.play(song.track, at + swing, drums.hat(), 0.05)
      if (beatIndex % 2) song.play(song.track, at, drums.rim(), 0.22)
    }
    song.play(song.track, start, drums.kick(), 0.4)
    song.play(song.track, start + 2 + swing, drums.kick(), 0.25)
  })

  melodic.echo(1.5 * song.beat, 0.3, 2)
  song.track.merge(melodic)
  return master(song.track, true)
}

// ---- Battle: steady and warm, E minor, 116 bpm -----------------------------------------------------

const BATTLE_CHORDS = [
  [40, 64, 67, 71], // Em
  [36, 64, 67, 72], // C
  [38, 62, 66, 69], // D
  [35, 62, 66, 71], // Bm
  [40, 64, 67, 71], // Em
  [36, 64, 67, 72], // C
  [38, 62, 66, 69], // D
  [35, 63, 66, 71], // B
]

/** Two bars per chord. */
const BATTLE_MELODY = [
  [
    [0, 0.5, 76],
    [0.5, 0.5, 76],
    [1, 1, 79],
    [2, 1, 83],
    [3, 1, 81],
    [4, 1.5, 79],
    [5.5, 0.5, 78],
    [6, 2, 76],
  ],
  [
    [0, 0.5, 79],
    [0.5, 0.5, 79],
    [1, 1, 76],
    [2, 1, 84],
    [3, 1, 83],
    [4, 1.5, 79],
    [5.5, 0.5, 76],
    [6, 2, 79],
  ],
  [
    [0, 0.5, 81],
    [0.5, 0.5, 81],
    [1, 1, 78],
    [2, 1, 86],
    [3, 1, 81],
    [4, 1.5, 78],
    [5.5, 0.5, 81],
    [6, 2, 74],
  ],
  [
    [0, 1, 83],
    [1, 1, 78],
    [2, 1, 74],
    [3, 1, 78],
    [4, 2, 71],
    [6, 1, 78],
    [7, 1, 83],
  ],
  [
    [0, 0.5, 83],
    [0.5, 0.5, 83],
    [1, 1, 86],
    [2, 1, 88],
    [3, 1, 86],
    [4, 1.5, 83],
    [5.5, 0.5, 81],
    [6, 2, 79],
  ],
  [
    [0, 0.5, 84],
    [0.5, 0.5, 84],
    [1, 1, 88],
    [2, 1, 91],
    [3, 1, 88],
    [4, 1.5, 84],
    [5.5, 0.5, 83],
    [6, 2, 79],
  ],
  [
    [0, 0.5, 86],
    [0.5, 0.5, 86],
    [1, 1, 81],
    [2, 1, 90],
    [3, 1, 86],
    [4, 1.5, 81],
    [5.5, 0.5, 78],
    [6, 2, 81],
  ],
  [
    [0, 0.5, 83],
    [0.5, 0.5, 83],
    [1, 1, 87],
    [2, 1, 90],
    [3, 1, 87],
    [4, 2, 83],
    [6, 0.5, 78],
    [6.5, 0.5, 80],
    [7, 1, 82],
  ],
]

const BASS_STEPS = [0, 0, 12, 0, 0, 12, 0, 7]

const battle = () => {
  const song = createSong({ bpm: 116, beats: 64, loop: true })
  const drums = createDrums(303)
  const melodic = song.part()

  BATTLE_CHORDS.forEach((chord, index) => {
    const start = index * 8
    const [root, ...upper] = chord
    song.play(song.track, start, pad(upper, 8 * song.beat), 0.07)
    for (let eighth = 0; eighth < 16; eighth++) {
      const note = root + BASS_STEPS[eighth % 8]
      song.play(song.track, start + eighth * 0.5, bass(note, 0.4 * song.beat), 0.5)
    }
    for (let step = 0; step < 32; step++) {
      const note = upper[[0, 1, 2, 1][step % 4]] + (step % 8 >= 4 ? 12 : 0)
      song.play(melodic, start + step * 0.25, pluck(note, 0.2 * song.beat), step % 4 ? 0.09 : 0.14)
    }
    song.melody(melodic, lead, BATTLE_MELODY[index], start, 0.2, -12)
    if (index >= 4) song.melody(melodic, lead, BATTLE_MELODY[index], start, 0.1)

    for (let bar = 0; bar < 2; bar++) {
      const at = start + bar * 4
      for (const offset of [0, 1.5, 2, 3.5]) song.play(song.track, at + offset, drums.kick(), 0.8)
      song.play(song.track, at + 1, drums.snare(), 0.42)
      song.play(song.track, at + 3, drums.snare(), 0.42)
      for (let sixteenth = 0; sixteenth < 16; sixteenth++) {
        song.play(song.track, at + sixteenth * 0.25, drums.hat(), sixteenth % 4 === 2 ? 0.16 : 0.07)
      }
    }
    // A short fill at the end of every four bars.
    if (index % 2) {
      for (const offset of [7, 7.25, 7.5, 7.75])
        song.play(song.track, start + offset, drums.snare(), 0.3)
    }
  })

  melodic.echo(0.75 * song.beat, 0.3, 2)
  song.track.merge(melodic)
  return master(song.track, true)
}

// ---- Victory: a short fanfare, C major -----------------------------------------------------

const victory = () => {
  const song = createSong({ bpm: 108, beats: 14, loop: false })
  const drums = createDrums(404)
  const third = 1 / 3
  const fanfare = [
    [0, third, 72],
    [third, third, 72],
    [2 * third, third, 72],
    [1, 1, 77],
    [2, 1, 79],
    [3, 5, 84],
  ]
  song.melody(song.track, lead, fanfare, 0, 0.26)
  song.melody(song.track, lead, fanfare, 0, 0.16, -12)
  song.melody(
    song.track,
    lead,
    [
      [1, 1, 72],
      [2, 1, 74],
      [3, 5, 79],
    ],
    0,
    0.14,
  )
  song.play(song.track, 1, pad([53, 60, 65, 69], song.beat), 0.14)
  song.play(song.track, 2, pad([55, 62, 67, 71], song.beat), 0.14)
  song.play(song.track, 3, pad([48, 60, 64, 67, 72], 6 * song.beat), 0.16)
  song.melody(
    song.track,
    bass,
    [
      [1, 1, 41],
      [2, 1, 43],
      [3, 5, 36],
    ],
    0,
    0.5,
  )
  for (const offset of [0, third, 2 * third, 1, 2])
    song.play(song.track, offset, drums.snare(), 0.3)
  for (let roll = 0; roll < 8; roll++)
    song.play(song.track, 2 + roll * 0.125, drums.snare(), 0.1 + roll * 0.03)
  song.play(song.track, 3, drums.kick(), 0.9)
  ;[84, 88, 91, 96, 100, 103, 108].forEach((note, index) => {
    song.play(song.track, 3.5 + index * 0.25, bell(note, song.beat), 0.2)
  })
  song.track.echo(0.5 * song.beat, 0.3, 2)
  return finish(filter(song.track.data, 'low', 5200, 1.2), { drive: 0.9, peak: 0.75, fade: 1.2 })
}

export const MUSIC_FILES = {
  'music/menu': menu,
  'music/waiting': waiting,
  'music/battle': battle,
  'music/victory': victory,
}
