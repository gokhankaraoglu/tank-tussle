import { Button } from '../../shared/ui/Button.js'
import { Screen } from '../../shared/ui/Screen.js'
import styles from './menu.module.css'

interface FriendScreenProps {
  readonly onSameDevice: () => void
  readonly onOnline: () => void
  readonly onBack: () => void
}

export const FriendScreen = ({ onSameDevice, onOnline, onBack }: FriendScreenProps) => (
  <Screen title="Play with a friend">
    <nav className={styles.modes} aria-label="How to play together">
      <button type="button" className={styles.mode} onClick={onSameDevice}>
        <span className={styles.modeTitle}>On this device</span>
        <span className={styles.modeSubtitle}>Take turns on one screen</span>
      </button>
      <button type="button" className={styles.mode} onClick={onOnline}>
        <span className={styles.modeTitle}>Online</span>
        <span className={styles.modeSubtitle}>Host a game and share the code, or join one</span>
      </button>
    </nav>
    <Button variant="ghost" onClick={onBack}>
      Back
    </Button>
  </Screen>
)
