import type { WeaponId } from '@tank-tussle/game-core'
import styles from './weapon-icon.module.css'

interface WeaponIconProps {
  readonly id: WeaponId
  /** Rendered size in CSS pixels; the art is vector, so any size stays sharp. */
  readonly size?: number
}

/** SVG icon for a weapon (`public/weapons/<id>.svg`). Decorative: shown next to its name. */
export const WeaponIcon = ({ id, size = 32 }: WeaponIconProps) => (
  <img
    className={styles.icon}
    src={`${import.meta.env.BASE_URL}weapons/${id}.svg`}
    width={size}
    height={size}
    alt=""
    onError={(event) => (event.currentTarget.style.visibility = 'hidden')}
  />
)
