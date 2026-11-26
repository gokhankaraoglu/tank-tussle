import type { MoveBlocks } from '@tank-tussle/client-core'
import { TANK } from '@tank-tussle/game-core'
import styles from './hud.module.css'

interface MoveControlProps {
  readonly movesLeft: number
  readonly disabled: boolean
  /** Arrow-only buttons with the pips underneath, for narrow side panels. */
  readonly compact?: boolean
  /** Walls, steep slopes or cliffs in the way; that direction's button is disabled. */
  readonly blocked?: MoveBlocks
  readonly onMove: (direction: -1 | 1) => void
}

const FREE: MoveBlocks = { left: null, right: null }

/** Large move buttons with one pip per remaining move, and why a direction is blocked. */
export const MoveControl = ({
  movesLeft,
  disabled,
  compact = false,
  blocked = FREE,
  onMove,
}: MoveControlProps) => {
  const unavailable = disabled || movesLeft === 0
  return (
    <div className={styles.move} data-compact={compact}>
      <MoveButton direction={-1} reason={blocked.left} unavailable={unavailable} onMove={onMove} />
      <span
        className={styles.pips}
        aria-label={`${movesLeft} of ${TANK.movesPerMatch} moves left`}
        role="img"
      >
        {Array.from({ length: TANK.movesPerMatch }, (_, index) => (
          <span key={index} className={styles.pip} data-used={index >= movesLeft} />
        ))}
      </span>
      <MoveButton direction={1} reason={blocked.right} unavailable={unavailable} onMove={onMove} />
      {!unavailable && <BlockedHint blocked={blocked} />}
    </div>
  )
}

interface MoveButtonProps {
  readonly direction: -1 | 1
  /** Why the tank cannot drive this way, or null. */
  readonly reason: string | null
  readonly unavailable: boolean
  readonly onMove: (direction: -1 | 1) => void
}

const MoveButton = ({ direction, reason, unavailable, onMove }: MoveButtonProps) => {
  const label = direction < 0 ? 'Move left' : 'Move right'
  return (
    <button
      type="button"
      className={styles.moveButton}
      disabled={unavailable || reason !== null}
      data-blocked={reason !== null}
      aria-label={reason ? `${label}: ${reason}` : label}
      title={reason ?? undefined}
      onClick={() => onMove(direction)}
    >
      {direction < 0 && <span aria-hidden>◀</span>}
      <span className={styles.moveLabel}>
        {direction < 0 ? (
          <>
            Move <kbd>A</kbd>
          </>
        ) : (
          <>
            <kbd>D</kbd> Move
          </>
        )}
      </span>
      {direction > 0 && <span aria-hidden>▶</span>}
    </button>
  )
}

/** One line naming what is in the way, pointing towards it. */
const BlockedHint = ({ blocked }: { readonly blocked: MoveBlocks }) => {
  if (!blocked.left && !blocked.right) return null
  const text = blocked.left ? `◀ ${blocked.left}` : `${blocked.right} ▶`
  return (
    <span className={styles.moveHint} role="status">
      {text}
    </span>
  )
}
