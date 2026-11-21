import { SoundControls } from '../../../audio/SoundControls.js'
import { Button } from '../../../shared/ui/Button.js'
import type { BattleViewProps } from './battle-view.js'
import { Battlefield } from './Battlefield.js'
import { FullscreenButton } from './FullscreenButton.js'
import { Hud } from './Hud.js'
import styles from './battle.module.css'

/** Desktop and tablet layout: battlefield on top, full HUD with sliders underneath. */
export const WideBattle = ({
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
}: BattleViewProps) => (
  <main className={styles.layout}>
    <div className={styles.topBar}>
      <span className={styles.status} role="status">
        {status}
      </span>
      <div className={styles.topActions}>
        <SoundControls />
        <FullscreenButton />
        <Button variant="ghost" onClick={onRequestExit}>
          Exit <kbd>Esc</kbd>
        </Button>
      </div>
    </div>
    <Battlefield
      snapshot={snapshot}
      aimingPlayer={aimingPlayer}
      onAim={(angle, power) => controls?.setAim(angle, power)}
      onShotFinished={onShotFinished}
      onShotEvents={onShotEvents}
    />
    <Hud
      state={snapshot.state}
      registry={registry}
      player={hudPlayer}
      slot={slot}
      controls={controls}
    />
  </main>
)
