/** Seeded pseudo-random generator. Same seed → same sequence on every platform. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Float in [min, max). */
  range(min: number, max: number): number
  /** Integer in [min, max]. */
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
}

/** mulberry32 — small, fast and good enough for gameplay randomness. */
export const createRng = (seed: number): Rng => {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const range = (min: number, max: number): number => min + next() * (max - min)
  const int = (min: number, max: number): number => Math.floor(range(min, max + 1))

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('Cannot pick from an empty list')
    return items[int(0, items.length - 1)] as T
  }

  return { next, range, int, pick }
}

/** Derives an independent seed from a base seed and a counter (e.g. shot number). */
export const deriveSeed = (seed: number, salt: number): number =>
  (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)) >>> 0

export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32) >>> 0
