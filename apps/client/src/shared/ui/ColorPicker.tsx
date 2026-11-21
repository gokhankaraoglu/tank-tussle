import { PLAYER_COLORS } from '@tank-tussle/protocol'
import styles from './ui.module.css'

interface ColorPickerProps {
  readonly value: string
  readonly onChange: (color: string) => void
  readonly label: string
}

export const ColorPicker = ({ value, onChange, label }: ColorPickerProps) => (
  <div className={styles.swatches} role="radiogroup" aria-label={label}>
    {PLAYER_COLORS.map((color) => (
      <button
        key={color.value}
        type="button"
        role="radio"
        aria-checked={value === color.value}
        aria-label={color.name}
        title={color.name}
        className={[styles.swatch, value === color.value && styles.swatchSelected]
          .filter(Boolean)
          .join(' ')}
        style={{ background: color.value, color: color.value }}
        onClick={() => onChange(color.value)}
      />
    ))}
  </div>
)
