import { TANK } from '@tank-tussle/game-core'
import styles from './hud.module.css'

interface MoveControlProps {
  readonly movesLeft: number
  readonly disabled: boolean
  /** Arrow-only buttons with the pips underneath, for narrow side panels. */
  readonly compact?: boolean
  readonly onMove: (direction: -1 | 1) => void
}

/** Large move buttons with one pip per remaining move. */
export const MoveControl = ({ movesLeft, disabled, compact = false, onMove }: MoveControlProps) => {
  const blocked = disabled || movesLeft === 0
  return (
    <div className={styles.move} data-compact={compact}>
      <button
        type="button"
        className={styles.moveButton}
        disabled={blocked}
        aria-label="Move left"
        onClick={() => onMove(-1)}
      >
        <span aria-hidden>◀</span>
        <span className={styles.moveLabel}>
          Move <kbd>A</kbd>
        </span>
      </button>
      <span
        className={styles.pips}
        aria-label={`${movesLeft} of ${TANK.movesPerMatch} moves left`}
        role="img"
      >
        {Array.from({ length: TANK.movesPerMatch }, (_, index) => (
          <span key={index} className={styles.pip} data-used={index >= movesLeft} />
        ))}
      </span>
      <button
        type="button"
        className={styles.moveButton}
        disabled={blocked}
        aria-label="Move right"
        onClick={() => onMove(1)}
      >
        <span className={styles.moveLabel}>
          <kbd>D</kbd> Move
        </span>
        <span aria-hidden>▶</span>
      </button>
    </div>
  )
}
