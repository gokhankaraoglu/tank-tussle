import { comboMultiplier, type MatchState, type PlayerIndex } from '@tank-tussle/game-core'
import styles from './hud.module.css'

interface PlayerCardProps {
  readonly state: MatchState
  readonly player: PlayerIndex
  /** Smaller variant for the phone layout. */
  readonly compact?: boolean
}

/** Name and score of one player; glows while it is their turn. */
export const PlayerCard = ({ state, player, compact = false }: PlayerCardProps) => {
  const tank = state.tanks[player]
  const active = state.phase === 'playing' && state.turn === player
  const streak = state.streaks[player]
  return (
    <div
      className={styles.card}
      data-active={active}
      data-compact={compact}
      style={{ ['--card-color' as string]: tank.color }}
    >
      <span className={styles.cardName}>{tank.name}</span>
      <span className={styles.score}>{tank.score}</span>
      {streak > 0 && (
        <span className={styles.combo} title="Combo: consecutive hits multiply your next shot">
          🔥 ×{comboMultiplier(streak)}
        </span>
      )}
    </div>
  )
}
