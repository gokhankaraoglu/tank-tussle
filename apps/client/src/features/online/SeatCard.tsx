import type { SeatView } from '@tank-tussle/protocol'
import { useCountdown } from '@tank-tussle/client-core'
import styles from './online.module.css'

interface SeatCardProps {
  readonly role: 'Host' | 'Guest'
  readonly seat: SeatView | null
  readonly isYou: boolean
}

export const SeatCard = ({ role, seat, isYou }: SeatCardProps) => {
  const secondsLeft = useCountdown(seat?.connected === false ? seat.reconnectDeadline : null)

  if (!seat) {
    return (
      <div className={`${styles.seat} ${styles.seatEmpty}`}>
        <span className={styles.seatRole}>{role}</span>
        <span className={styles.pulse}>Waiting for an opponent…</span>
      </div>
    )
  }

  return (
    <div className={styles.seat} style={{ ['--seat-color' as string]: seat.color }}>
      <span className={styles.seatRole}>
        {role}
        {isYou && ' · you'}
      </span>
      <span className={styles.seatName}>{seat.name}</span>
      <span className={styles.seatState} data-connected={seat.connected}>
        {seat.connected ? 'Ready' : `Reconnecting… ${secondsLeft ?? ''}s`}
      </span>
    </div>
  )
}
