import type { SessionSnapshot } from './game-session.js'

/** Immutable snapshot + listeners. Compatible with React's useSyncExternalStore. */
export class SessionStore {
  private readonly listeners = new Set<() => void>()

  constructor(private snapshot: SessionSnapshot) {}

  get = (): SessionSnapshot => this.snapshot

  set(patch: Partial<SessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
