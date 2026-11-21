import { LADDER } from '@tank-tussle/client-core'
import { Button } from '../../shared/ui/Button.js'
import { Screen } from '../../shared/ui/Screen.js'
import styles from './menu.module.css'

interface LadderScreenProps {
  /** Highest level beaten so far. */
  readonly beaten: number
  readonly onChallenge: (level: number) => void
  readonly onBack: () => void
}

type RungState = 'beaten' | 'next' | 'locked'

const stateOf = (level: number, beaten: number): RungState => {
  if (level <= beaten) return 'beaten'
  return level === beaten + 1 ? 'next' : 'locked'
}

const STATE_LABELS: Record<RungState, string> = {
  beaten: 'Beaten · play again',
  next: 'Challenge',
  locked: 'Locked',
}

/** The solo progression: each win unlocks a stronger computer opponent. */
export const LadderScreen = ({ beaten, onChallenge, onBack }: LadderScreenProps) => (
  <Screen
    title="Ladder"
    subtitle={
      beaten >= LADDER.length
        ? 'You beat every opponent. Legend!'
        : 'Beat an opponent to unlock the next one'
    }
  >
    <ol className={styles.ladder}>
      {LADDER.map(({ level, name }) => {
        const state = stateOf(level, beaten)
        return (
          <li key={level}>
            <button
              type="button"
              className={styles.rung}
              data-state={state}
              disabled={state === 'locked'}
              onClick={() => onChallenge(level)}
            >
              <span className={styles.rungLevel}>{level}</span>
              <span className={styles.rungName}>{name}</span>
              <span className={styles.rungState}>{STATE_LABELS[state]}</span>
            </button>
          </li>
        )
      })}
    </ol>
    <Button variant="ghost" onClick={onBack}>
      Back
    </Button>
  </Screen>
)
