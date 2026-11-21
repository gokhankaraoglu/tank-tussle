import { holdAcceleration, useHoldRepeat } from '../../../shared/use-hold-repeat.js'
import { AIM_STEPS, roundAim } from '@tank-tussle/client-core'
import styles from './hud.module.css'

interface AimFieldProps {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  /** Change per button press; grows while the button is held. */
  readonly step: number
  readonly unit?: string
  readonly icons: readonly [decrease: string, increase: string]
  readonly disabled: boolean
  /** `stack`: buttons above and below the value, no slider — for narrow side panels. */
  readonly layout?: 'row' | 'stack'
  readonly onChange: (value: number) => void
}

/**
 * One aim value (angle or power): hold-to-repeat buttons, a slider with 0.1 precision and a
 * number field for typing an exact value.
 */
export const AimField = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  icons,
  disabled,
  layout = 'row',
  onChange,
}: AimFieldProps) => {
  const set = (next: number) => onChange(roundAim(Math.min(max, Math.max(min, next))))
  const decrease = useHoldRepeat(
    (repeat) => set(value - step * holdAcceleration(repeat)),
    !disabled && value > min,
  )
  const increase = useHoldRepeat(
    (repeat) => set(value + step * holdAcceleration(repeat)),
    !disabled && value < max,
  )

  return (
    <div className={styles.aimField} data-layout={layout}>
      <button
        type="button"
        className={styles.nudge}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label}`}
        title="Hold to repeat"
        {...decrease}
      >
        {icons[0]}
      </button>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={AIM_STEPS.fine}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => set(Number(event.target.value))}
      />
      <button
        type="button"
        className={styles.nudge}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label}`}
        title="Hold to repeat"
        {...increase}
      >
        {icons[1]}
      </button>
      <label className={styles.numberWrap}>
        <input
          type="number"
          inputMode="decimal"
          enterKeyHint="done"
          className={styles.number}
          min={min}
          max={max}
          step={AIM_STEPS.fine}
          value={value.toFixed(1)}
          disabled={disabled}
          aria-label={`Exact ${label}`}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (event.target.value !== '' && Number.isFinite(next)) set(next)
          }}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </label>
    </div>
  )
}
