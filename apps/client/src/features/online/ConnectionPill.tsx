import type { ConnectionStatus } from '@tank-tussle/client-core'
import styles from './online.module.css'

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Online',
  reconnecting: 'Reconnecting…',
  offline: 'Server unreachable',
  outdated: 'Server version differs — restart or redeploy it',
}

export const ConnectionPill = ({ status }: { readonly status: ConnectionStatus }) => (
  <span className={styles.pill} data-status={status} role="status">
    <span className={styles.dot} />
    {LABEL[status]}
  </span>
)
