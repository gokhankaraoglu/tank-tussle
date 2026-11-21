import type { ReactNode } from 'react'
import styles from './ui.module.css'

interface ScreenProps {
  readonly title: string
  readonly subtitle?: string
  readonly children: ReactNode
}

export const Screen = ({ title, subtitle, children }: ScreenProps) => (
  <main className={styles.screen}>
    <h1 className={styles.title}>{title}</h1>
    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    {children}
  </main>
)

export const Panel = ({ children }: { readonly children: ReactNode }) => (
  <section className={styles.panel}>{children}</section>
)
