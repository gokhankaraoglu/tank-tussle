import { AIM_STEPS, type BattleControls } from '@tank-tussle/client-core'
import { useKeyBindings } from '../../../shared/use-key-bindings.js'

/** Shift = big steps, Alt = fine steps. */
const step = (event: KeyboardEvent): number => {
  if (event.shiftKey) return AIM_STEPS.coarse
  return event.altKey ? AIM_STEPS.fine : AIM_STEPS.normal
}

export const useBattleKeys = (controls: BattleControls | null): void => {
  useKeyBindings(
    {
      KeyQ: (event) => controls?.rotate(step(event)),
      ArrowLeft: (event) => controls?.rotate(step(event)),
      KeyE: (event) => controls?.rotate(-step(event)),
      ArrowRight: (event) => controls?.rotate(-step(event)),
      KeyW: (event) => controls?.changePower(step(event)),
      ArrowUp: (event) => controls?.changePower(step(event)),
      KeyS: (event) => controls?.changePower(-step(event)),
      ArrowDown: (event) => controls?.changePower(-step(event)),
      KeyA: () => controls?.move(-1),
      KeyD: () => controls?.move(1),
      KeyZ: () => controls?.cycleWeapon(-1),
      KeyX: () => controls?.cycleWeapon(1),
      Space: (event) => !event.repeat && controls?.fire(),
    },
    controls !== null,
  )
}
