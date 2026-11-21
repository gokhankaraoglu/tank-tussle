/**
 * Generates every sound of the game from code: `npm run sounds -w @tank-tussle/client`.
 *
 * Effects are written as WAV. Music is written as WAV and, on macOS, compressed to AAC (.m4a)
 * with the built-in `afconvert`; elsewhere convert `music/*.wav` to .m4a with any encoder.
 * All sounds are original to this project.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SAMPLE_RATE, encodeWav, soften } from './synth/dsp.mjs'
import { EFFECT_FILES } from './synth/effects.mjs'
import { MUSIC_FILES } from './synth/music.mjs'

const outDir = fileURLToPath(new URL('../public/sounds/', import.meta.url))
const AFCONVERT = '/usr/bin/afconvert'

const writeWav = (name, samples) => {
  const path = `${outDir}${name}.wav`
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, encodeWav(samples))
  console.log(`${name}.wav  ${(samples.length / SAMPLE_RATE).toFixed(2)}s`)
  return path
}

for (const [name, make] of Object.entries(EFFECT_FILES)) writeWav(name, soften(make()))

for (const [name, make] of Object.entries(MUSIC_FILES)) {
  const wav = writeWav(name, make())
  if (!existsSync(AFCONVERT)) {
    console.warn(`  afconvert not found: convert ${name}.wav to ${name}.m4a yourself`)
    continue
  }
  execFileSync(AFCONVERT, ['-f', 'm4af', '-d', 'aac', '-b', '96000', wav, `${outDir}${name}.m4a`])
  rmSync(wav)
}
