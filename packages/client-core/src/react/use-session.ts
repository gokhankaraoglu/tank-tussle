import { useSyncExternalStore } from 'react'
import type { GameSession, SessionSnapshot } from '../session/game-session.js'

export const useSessionSnapshot = (session: GameSession): SessionSnapshot =>
  useSyncExternalStore(session.subscribe, session.getSnapshot)
