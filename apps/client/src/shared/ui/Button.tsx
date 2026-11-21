import type { ButtonHTMLAttributes } from 'react'
import styles from './ui.module.css'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant
  readonly large?: boolean
}

const VARIANT_CLASS: Record<Variant, string | undefined> = {
  primary: styles.primary,
  secondary: undefined,
  ghost: styles.ghost,
}

export const Button = ({
  variant = 'secondary',
  large = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={[styles.button, VARIANT_CLASS[variant], large && styles.large, className]
      .filter(Boolean)
      .join(' ')}
    {...props}
  />
)
