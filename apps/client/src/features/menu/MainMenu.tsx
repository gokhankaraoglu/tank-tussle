import { LADDER } from '@tank-tussle/client-core'
import type { PlayerProfile } from '@tank-tussle/game-core'
import { useState } from 'react'
import { Button } from '../../shared/ui/Button.js'
import { Panel, Screen } from '../../shared/ui/Screen.js'
import { ControlsHelp } from './ControlsHelp.js'
import styles from './menu.module.css'

interface MainMenuProps {
  readonly profile: PlayerProfile
  /** Highest ladder level beaten so far. */
  readonly ladderBeaten: number
  readonly onPlay: () => void
  readonly onLadder: () => void
  readonly onFriend: () => void
  readonly onPractice: () => void
  readonly onProfile: () => void
}

/** One big button to play right away; everything else is one step further. */
export const MainMenu = ({
  profile,
  ladderBeaten,
  onPlay,
  onLadder,
  onFriend,
  onPractice,
  onProfile,
}: MainMenuProps) => {
  const [showControls, setShowControls] = useState(false)

  return (
    <Screen title="Tank Tussle" subtitle="The fastest artillery game you'll ever play">
      <button type="button" className={styles.profile} onClick={onProfile}>
        <span className={styles.swatch} style={{ background: profile.color }} />
        {profile.name}
        <span className={styles.edit}>Edit</span>
      </button>

      <button type="button" className={styles.play} onClick={onPlay}>
        <span className={styles.playTitle}>Play</span>
        <span className={styles.playSubtitle}>Find an opponent — or take on the computer</span>
      </button>

      <nav className={styles.modes} aria-label="More ways to play">
        <button type="button" className={styles.mode} onClick={onLadder}>
          <span className={styles.modeTitle}>Ladder</span>
          <span className={styles.modeSubtitle}>
            Beat the computer, rung by rung · {ladderBeaten}/{LADDER.length}
          </span>
        </button>
        <button type="button" className={styles.mode} onClick={onFriend}>
          <span className={styles.modeTitle}>Play with a friend</span>
          <span className={styles.modeSubtitle}>On this device or online with a code</span>
        </button>
      </nav>

      <div className={styles.links}>
        <Button variant="ghost" onClick={onPractice}>
          Practice
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowControls((open) => !open)}
          aria-expanded={showControls}
        >
          {showControls ? 'Hide controls' : 'How to play'}
        </Button>
      </div>
      {showControls && (
        <Panel>
          <ControlsHelp />
        </Panel>
      )}
    </Screen>
  )
}
