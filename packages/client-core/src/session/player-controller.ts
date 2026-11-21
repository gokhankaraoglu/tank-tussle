/** Who drives a tank in a local match. */
export type PlayerController =
  | { readonly kind: 'human' }
  | { readonly kind: 'cpu'; readonly level: number }
  /** Practice target: never acts. */
  | { readonly kind: 'idle' }

export const HUMAN: PlayerController = { kind: 'human' }
export const IDLE: PlayerController = { kind: 'idle' }
export const cpu = (level: number): PlayerController => ({ kind: 'cpu', level })
