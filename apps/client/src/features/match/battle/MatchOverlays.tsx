import type { SessionSnapshot } from '@tank-tussle/client-core'
import { useCountdown } from '@tank-tussle/client-core'
import { Button } from '../../../shared/ui/Button.js'
import { GameOverDialog, Overlay } from './GameOverDialog.js'
import styles from './battle.module.css'

interface MatchOverlaysProps {
  readonly snapshot: SessionSnapshot
  readonly confirmingExit: boolean
  readonly onCancelExit: () => void
  readonly onRematch: () => void
  readonly onExit: () => void
}

/** Everything shown on top of the shop or battle, most important first. */
export const MatchOverlays = ({
  snapshot,
  confirmingExit,
  onCancelExit,
  onRematch,
  onExit,
}: MatchOverlaysProps) => {
  const { state, pendingShot, status, presence } = snapshot

  if (status === 'closed') {
    return (
      <Overlay title="Game ended">
        <p className={styles.muted}>{snapshot.closedMessage}</p>
        <Button variant="primary" onClick={onExit}>
          Main menu
        </Button>
      </Overlay>
    )
  }

  if (presence?.self === 'reconnecting') {
    return (
      <Overlay title="Connection lost">
        <p className={styles.muted}>Reconnecting… your seat is kept for you.</p>
        <Button variant="ghost" onClick={onExit}>
          Give up
        </Button>
      </Overlay>
    )
  }

  if (confirmingExit) {
    return (
      <Overlay title="Leave the match?">
        <div className={styles.dialogActions}>
          <Button onClick={onCancelExit}>Keep playing</Button>
          <Button variant="primary" onClick={onExit}>
            Leave
          </Button>
        </div>
      </Overlay>
    )
  }

  if (state.phase === 'over' && !pendingShot) {
    return (
      <GameOverDialog
        state={state}
        rematchRequestedBy={snapshot.rematchRequestedBy}
        localPlayers={snapshot.controllable}
        onRematch={onRematch}
        onExit={onExit}
      />
    )
  }

  if (presence && !presence.opponentConnected) {
    return <OpponentAwayBanner deadline={presence.opponentDeadline} />
  }

  return null
}

/** Non-blocking notice: the game stays visible while we wait for the opponent. */
const OpponentAwayBanner = ({ deadline }: { readonly deadline: number | null }) => {
  const secondsLeft = useCountdown(deadline)
  return (
    <div className={styles.toast} role="status">
      Opponent disconnected — waiting {secondsLeft ?? ''}s for them to return
    </div>
  )
}
