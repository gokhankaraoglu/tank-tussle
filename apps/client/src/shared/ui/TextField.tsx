import { useId, type InputHTMLAttributes } from 'react'
import styles from './ui.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string
}

export const TextField = ({ label, ...props }: TextFieldProps) => {
  const id = useId()
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={styles.input} {...props} />
    </div>
  )
}

export const FieldLabel = ({ children }: { readonly children: string }) => (
  <span className={styles.label}>{children}</span>
)

export const ErrorText = ({ children }: { readonly children: string | null }) =>
  children ? (
    <p className={styles.error} role="alert">
      {children}
    </p>
  ) : null
