import { AIM, type MatchState, type PlayerIndex, type WeaponRegistry } from '@tank-tussle/game-core'
import type { ReactNode } from 'react'
import { Button } from '../../../shared/ui/Button.js'
import { AimField } from './AimField.js'
import { slopeInfo } from '@tank-tussle/client-core'
import { MoveControl } from './MoveControl.js'
import { PlayerCard } from './PlayerCard.js'
import type { BattleControls } from '@tank-tussle/client-core'
import { WeaponPicker } from './WeaponPicker.js'
import styles from './hud.module.css'

interface HudProps {
  readonly state: MatchState
  readonly registry: WeaponRegistry
  /** Tank whose controls are shown (the local player, or the one on turn). */
  readonly player: PlayerIndex
  readonly slot: number
  /** Null while it is not this device's turn. */
  readonly controls: BattleControls | null
}

export const Hud = ({ state, registry, player, slot, controls }: HudProps) => {
  const tank = state.tanks[player]
  const inventory = state.inventories[player]
  const disabled = controls === null

  return (
    <div className={styles.hud} style={{ ['--tank-color' as string]: tank.color }}>
      <PlayerCard state={state} player={0} />

      <div className={styles.controls} aria-label="Controls">
        <Control label="Weapon" area="weapon">
          <WeaponPicker
            inventory={inventory}
            spent={state.spent[player]}
            registry={registry}
            slot={slot}
            unlimited={state.config.mode === 'practice'}
            canSelect={!disabled}
            onSelect={(next) => controls?.selectWeapon(next)}
          />
        </Control>

        <Control label="Angle" area="angle" hint={slopeHint(state, player)}>
          <AimField
            label="angle"
            value={tank.angle}
            min={AIM.minElevation}
            max={AIM.maxElevation}
            step={1}
            unit="°"
            icons={['↷', '↶']}
            disabled={disabled}
            onChange={(angle) => controls?.setAngle(angle)}
          />
        </Control>

        <Control label="Power" area="power" hint="or drag on the battlefield">
          <AimField
            label="power"
            value={tank.power}
            min={AIM.minPower}
            max={AIM.maxPower}
            step={0.5}
            icons={['−', '+']}
            disabled={disabled}
            onChange={(power) => controls?.setPower(power)}
          />
        </Control>

        <Control label="Move" area="move">
          <MoveControl
            movesLeft={tank.movesLeft}
            disabled={disabled}
            onMove={(direction) => controls?.move(direction)}
          />
        </Control>

        <Button
          variant="primary"
          large
          className={styles.fire}
          disabled={disabled || inventory[slot] === undefined}
          onClick={() => controls?.fire()}
        >
          Fire
        </Button>
      </div>

      <PlayerCard state={state} player={1} />
    </div>
  )
}

/**
 * The angle control sets the barrel's elevation from the hull. On a slope the barrel leans with
 * the hull, so show the tilt and where the barrel actually points, e.g. "Tilt +12° · aims 57°".
 */
const slopeHint = (state: MatchState, player: PlayerIndex): string => {
  const { tilt, aims } = slopeInfo(state, player)
  return `Tilt ${tilt > 0 ? '+' : ''}${tilt}° · aims ${aims}°`
}

type ControlArea = 'weapon' | 'angle' | 'power' | 'move'

interface ControlProps {
  readonly label: string
  readonly hint?: string
  readonly area: ControlArea
  readonly children: ReactNode
}

const Control = ({ label, hint, area, children }: ControlProps) => (
  <div className={styles.control} style={{ gridArea: area }}>
    <span className={styles.controlLabel}>
      {label}
      {hint && <span className={styles.hint}>{hint}</span>}
    </span>
    {children}
  </div>
)
