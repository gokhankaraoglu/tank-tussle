import { clampAngle, clampPower, type MatchState, type PlayerIndex } from '@tank-tussle/game-core'
import type { GameSession } from '../session/game-session.js'

/** Power and angle can be set to a tenth of a unit. */
export const AIM_STEPS = { fine: 0.1, normal: 1, coarse: 5 } as const

/** Avoids floating-point drift such as 59.99999 after repeated 0.1 steps. */
export const roundAim = (value: number): number => Math.round(value * 10) / 10

export interface BattleControls {
  rotate(delta: number): void
  setAngle(angle: number): void
  setPower(power: number): void
  /** Sets both at once, e.g. while dragging on the battlefield. */
  setAim(angle: number, power: number): void
  changePower(delta: number): void
  move(direction: -1 | 1): void
  selectWeapon(slot: number): void
  cycleWeapon(delta: number): void
  fire(): void
}

/** Translates high-level intents into session calls for the local player whose turn it is. */
export const createBattleControls = (
  session: GameSession,
  state: MatchState,
  player: PlayerIndex,
  slot: number,
  selectSlot: (slot: number) => void,
): BattleControls => {
  const tank = state.tanks[player]
  const weapons = state.inventories[player].length
  const setAim = (angle: number, power: number) =>
    session.aim(clampAngle(roundAim(angle)), clampPower(roundAim(power)))
  const setPower = (power: number) => setAim(tank.angle, power)
  return {
    rotate: (delta) => setAim(tank.angle + delta, tank.power),
    setAngle: (angle) => setAim(angle, tank.power),
    setPower,
    setAim,
    changePower: (delta) => setPower(tank.power + delta),
    move: (direction) => session.move(direction),
    selectWeapon: (next) => next >= 0 && next < weapons && selectSlot(next),
    cycleWeapon: (delta) => weapons > 0 && selectSlot((slot + delta + weapons) % weapons),
    fire: () => session.fire(slot),
  }
}
