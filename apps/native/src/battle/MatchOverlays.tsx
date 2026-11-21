import { resultHeadline, useCountdown, type SessionSnapshot } from '@tank-tussle/client-core'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, space } from '../theme'
import { Button } from '../ui/Button'
import { Muted } from '../ui/Screen'

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
        <Muted>{snapshot.closedMessage}</Muted>
        <Button variant="primary" onPress={onExit}>
          Main menu
        </Button>
      </Overlay>
    )
  }
  if (presence?.self === 'reconnecting') {
    return (
      <Overlay title="Connection lost">
        <Muted>Reconnecting… your seat is kept for you.</Muted>
        <Button variant="ghost" onPress={onExit}>
          Give up
        </Button>
      </Overlay>
    )
  }
  if (confirmingExit) {
    return (
      <Overlay title="Leave the match?">
        <View style={styles.actions}>
          <Button onPress={onCancelExit}>Keep playing</Button>
          <Button variant="primary" onPress={onExit}>
            Leave
          </Button>
        </View>
      </Overlay>
    )
  }
  if (state.phase === 'over' && !pendingShot) {
    return <GameOver snapshot={snapshot} onRematch={onRematch} onExit={onExit} />
  }
  if (presence && !presence.opponentConnected) {
    return <OpponentAway deadline={presence.opponentDeadline} />
  }
  return null
}

interface GameOverProps {
  readonly snapshot: SessionSnapshot
  readonly onRematch: () => void
  readonly onExit: () => void
}

const GameOver = ({ snapshot, onRematch, onExit }: GameOverProps) => {
  const { state, rematchRequestedBy, controllable } = snapshot
  const waiting = controllable.some((player) => rematchRequestedBy.includes(player))
  const opponentAsked = rematchRequestedBy.some((player) => !controllable.includes(player))
  return (
    <Overlay title={resultHeadline(state)}>
      <Text style={styles.finalScore}>
        <Text style={{ color: state.tanks[0].color }}>{state.tanks[0].score}</Text>
        {' – '}
        <Text style={{ color: state.tanks[1].color }}>{state.tanks[1].score}</Text>
      </Text>
      {opponentAsked && !waiting && <Muted>Your opponent wants a rematch!</Muted>}
      <View style={styles.actions}>
        <Button variant="ghost" onPress={onExit}>
          Main menu
        </Button>
        <Button variant="primary" disabled={waiting} onPress={onRematch}>
          {waiting ? 'Waiting for opponent…' : 'Play again'}
        </Button>
      </View>
    </Overlay>
  )
}

/** Non-blocking notice: the game stays visible while we wait for the opponent. */
const OpponentAway = ({ deadline }: { readonly deadline: number | null }) => {
  const secondsLeft = useCountdown(deadline)
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText} accessibilityLiveRegion="polite">
        Opponent disconnected — waiting {secondsLeft ?? ''}s for them to return
      </Text>
    </View>
  )
}

const Overlay = ({ title, children }: { readonly title: string; readonly children: ReactNode }) => (
  <View style={styles.overlay} accessibilityViewIsModal>
    <View style={styles.dialog}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  </View>
)

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 5, 15, 0.72)',
  },
  dialog: {
    minWidth: 300,
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  finalScore: { color: colors.text, fontSize: 34, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: space.md },
  toast: { position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center' },
  toastText: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.card,
    color: colors.text,
    fontWeight: '700',
  },
})
