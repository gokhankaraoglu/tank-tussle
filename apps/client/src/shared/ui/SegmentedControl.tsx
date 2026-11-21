import styles from './ui.module.css'

export interface Segment<T extends string | number> {
  readonly value: T
  readonly label: string
  readonly hint?: string
}

interface SegmentedControlProps<T extends string | number> {
  readonly label: string
  readonly value: T
  readonly options: readonly Segment<T>[]
  readonly onChange: (value: T) => void
}

/** A row of mutually exclusive choices with an optional hint under each. */
export const SegmentedControl = <T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) => (
  <div className={styles.segments} role="radiogroup" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        className={styles.segment}
        onClick={() => onChange(option.value)}
      >
        <span className={styles.segmentLabel}>{option.label}</span>
        {option.hint && <span className={styles.segmentHint}>{option.hint}</span>}
      </button>
    ))}
  </div>
)
