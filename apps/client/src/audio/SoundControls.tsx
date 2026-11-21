import { useKeyBindings } from '../shared/use-key-bindings.js'
import { useAudio, useAudioSettings } from './use-audio.js'
import styles from './sound-controls.module.css'

/** Mute / music toggles (mute also on the M key). Floating on menus, inline in a match. */
export const SoundControls = ({ floating = false }: { readonly floating?: boolean }) => {
  const { settings } = useAudio()
  const { muted, musicEnabled } = useAudioSettings()
  const toggleMute = () => settings.update({ muted: !muted })

  useKeyBindings({ KeyM: toggleMute })

  return (
    <div className={floating ? `${styles.controls} ${styles.floating}` : styles.controls}>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={!muted}
        aria-label={muted ? 'Unmute sound (M)' : 'Mute sound (M)'}
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
        onClick={toggleMute}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={musicEnabled}
        aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
        title={musicEnabled ? 'Music on' : 'Music off'}
        disabled={muted}
        onClick={() => settings.update({ musicEnabled: !musicEnabled })}
        data-off={!musicEnabled}
      >
        ♪
      </button>
    </div>
  )
}
