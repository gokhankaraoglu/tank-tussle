import { TOUCH_DEVICE, useMediaQuery } from '../../shared/use-media-query.js'
import styles from './menu.module.css'

const KEYBOARD: readonly [keys: string[], action: string][] = [
  [['Q', 'E'], 'Raise / lower the barrel (Shift: big steps, Alt: 0.1)'],
  [['W', 'S'], 'Increase / decrease power'],
  [['A', 'D'], 'Move tank (4 moves per match)'],
  [['Z', 'X'], 'Previous / next weapon'],
  [['Space'], 'Fire'],
  [['M'], 'Mute'],
  [['Esc'], 'Leave the match'],
]

const TOUCH: readonly [gesture: string, action: string][] = [
  ['Drag', 'Drag on the battlefield: direction sets the angle, distance sets the power'],
  ['Hold ±', 'Hold the + / − buttons to fine-tune; they speed up the longer you hold'],
  ['◀ ▶', 'Move your tank (4 moves per match)'],
  ['Weapon', 'Tap the weapon name at the top to pick another one'],
  ['Rotate', 'Turn your phone sideways for the biggest battlefield'],
]

/** Explains the controls for the device in hand: gestures on touch screens, keys elsewhere. */
export const ControlsHelp = () => {
  const touch = useMediaQuery(TOUCH_DEVICE)
  return (
    <dl className={styles.controls}>
      {touch
        ? TOUCH.map(([gesture, action]) => (
            <div key={gesture} style={{ display: 'contents' }}>
              <dt className={styles.gesture}>{gesture}</dt>
              <dd>{action}</dd>
            </div>
          ))
        : KEYBOARD.map(([keys, action]) => (
            <div key={action} style={{ display: 'contents' }}>
              <dt>
                {keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
    </dl>
  )
}
