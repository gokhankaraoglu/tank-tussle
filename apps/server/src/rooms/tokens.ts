/** `() => number` returning the current epoch ms. Tests inject a fake clock. */
export const CLOCK = Symbol('CLOCK')
export type Clock = () => number
