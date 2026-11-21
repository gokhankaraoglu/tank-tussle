import type { ReactNode } from 'react'
import type { MatchState, PlayerIndex } from '@tank-tussle/game-core'
import { Button } from '../../../shared/ui/Button.js'
import styles from './battle.module.css'

interface GameOverDialogProps {
  readonly state: MatchState
  readonly rematchRequestedBy: readonly PlayerIndex[]
  readonly localPlayers: readonly PlayerIndex[]
  readonly onRematch: () => void
  readonly onExit: () => void
}

export const GameOverDialog = ({
  state,
  rematchRequestedBy,
  localPlayers,
  onRematch,
  onExit,
}: GameOverDialogProps) => {
  const headline =
    state.result === 'draw' ? "It's a draw!" : `${state.tanks[state.result ?? 0].name} wins!`
  const waitingForOpponent = localPlayers.some((player) => rematchRequestedBy.includes(player))
  const opponentWantsRematch = rematchRequestedBy.some((player) => !localPlayers.includes(player))

  return (
    <Overlay title={headline}>
      <p className={styles.finalScore}>
        <span style={{ color: state.tanks[0].color }}>{state.tanks[0].score}</span>
        {' – '}
        <span style={{ color: state.tanks[1].color }}>{state.tanks[1].score}</span>
      </p>
      {opponentWantsRematch && !waitingForOpponent && (
        <p className={styles.muted}>Your opponent wants a rematch!</p>
      )}
      <div className={styles.dialogActions}>
        <Button variant="ghost" onClick={onExit}>
          Main menu
        </Button>
        <Button variant="primary" disabled={waitingForOpponent} onClick={onRematch}>
          {waitingForOpponent ? 'Waiting for opponent…' : 'Play again'}
        </Button>
      </div>
    </Overlay>
  )
}

export const Overlay = ({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) => (
  <div className={styles.overlay}>
    <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
      <h2 className={styles.dialogTitle}>{title}</h2>
      {children}
    </div>
  </div>
)
