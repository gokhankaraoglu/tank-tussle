import { AIM } from '@tank-tussle/game-core'
import { SoundControls } from '../../../audio/SoundControls.js'
import { Button } from '../../../shared/ui/Button.js'
import { AimField } from './AimField.js'
import { moveBlocks, slopeInfo } from '@tank-tussle/client-core'
import type { BattleViewProps } from './battle-view.js'
import { Battlefield } from './Battlefield.js'
import { FullscreenButton } from './FullscreenButton.js'
import { MoveControl } from './MoveControl.js'
import { PlayerCard } from './PlayerCard.js'
import { WeaponPicker } from './WeaponPicker.js'
import styles from './compact-battle.module.css'

/**
 * Phone layout. Sideways: the battlefield fills the middle and the controls sit under the
 * thumbs — angle and movement on the left, power and fire on the right. Upright: the field
 * spans the width and the same two panels sit side by side underneath. Aiming is mainly done
 * by dragging on the battlefield; the buttons are for fine adjustment.
 */
export const CompactBattle = ({
  snapshot,
  registry,
  hudPlayer,
  slot,
  controls,
  aimingPlayer,
  status,
  onRequestExit,
  onShotFinished,
  onShotEvents,
}: BattleViewProps) => {
  const { state } = snapshot
  const tank = state.tanks[hudPlayer]
  const inventory = state.inventories[hudPlayer]
  const disabled = controls === null

  return (
    <main className={styles.layout} style={{ ['--tank-color' as string]: tank.color }}>
      <header className={styles.top}>
        <span className={styles.status} role="status">
          {status}
        </span>
        <div className={styles.weapon}>
          <WeaponPicker
            compact
            inventory={inventory}
            spent={state.spent[hudPlayer]}
            registry={registry}
            slot={slot}
            unlimited={state.config.mode === 'practice'}
            canSelect={!disabled}
            onSelect={(next) => controls?.selectWeapon(next)}
          />
        </div>
        <div className={styles.actions}>
          <SoundControls />
          <FullscreenButton className={styles.exit} />
          <Button variant="ghost" className={styles.exit} onClick={onRequestExit}>
            Exit
          </Button>
        </div>
      </header>

      <p className={styles.rotateHint} aria-hidden>
        ↻ Turn your phone sideways for a bigger battlefield
      </p>

      <aside className={styles.side} style={{ gridArea: 'left' }} aria-label="Angle and movement">
        <PlayerCard state={state} player={0} compact />
        <span className={styles.label}>
          Angle <span className={styles.hint}>aims {slopeInfo(state, hudPlayer).aims}°</span>
        </span>
        <AimField
          layout="stack"
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
        <MoveControl
          compact
          movesLeft={tank.movesLeft}
          disabled={disabled}
          blocked={moveBlocks(state, hudPlayer)}
          onMove={(direction) => controls?.move(direction)}
        />
      </aside>

      <div className={styles.fieldCell}>
        <div className={styles.fieldBox}>
          <Battlefield
            snapshot={snapshot}
            aimingPlayer={aimingPlayer}
            onAim={(angle, power) => controls?.setAim(angle, power)}
            onShotFinished={onShotFinished}
            onShotEvents={onShotEvents}
          />
        </div>
      </div>

      <aside className={styles.side} style={{ gridArea: 'right' }} aria-label="Power and fire">
        <PlayerCard state={state} player={1} compact />
        <span className={styles.label}>Power</span>
        <AimField
          layout="stack"
          label="power"
          value={tank.power}
          min={AIM.minPower}
          max={AIM.maxPower}
          step={0.5}
          icons={['−', '+']}
          disabled={disabled}
          onChange={(power) => controls?.setPower(power)}
        />
        <Button
          variant="primary"
          className={styles.fire}
          disabled={disabled || inventory[slot] === undefined}
          onClick={() => controls?.fire()}
        >
          Fire
        </Button>
      </aside>
    </main>
  )
}
