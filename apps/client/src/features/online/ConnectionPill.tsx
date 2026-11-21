import type { ConnectionStatus } from '@tank-tussle/client-core'

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Online',
  reconnecting: 'Reconnecting…',
  offline: 'Server unreachable',
  outdated: 'Server version differs — restart or redeploy it',
}

/** The status light's look per state; `outdated` keeps the neutral grey. */
const DOT: Record<ConnectionStatus, string> = {
  connecting: 'bg-warning animate-blink motion-reduce:animate-none',
  reconnecting: 'bg-warning animate-blink motion-reduce:animate-none',
  connected: 'bg-success shadow-[0_0_8px_var(--success)]',
  offline: 'bg-danger',
  outdated: 'bg-muted',
}

/** Tailwind pilot: the first component styled with utility classes instead of a CSS Module. */
export const ConnectionPill = ({ status }: { readonly status: ConnectionStatus }) => (
  <span
    className="border-line bg-elevated text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.85rem] font-semibold"
    data-status={status}
    role="status"
  >
    <span className={`size-2 rounded-full ${DOT[status]}`} />
    {LABEL[status]}
  </span>
)
