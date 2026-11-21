import type { Dependencies } from './dependencies.js'
import { publicWebUrl } from '../shared/platform.js'
import { initialScreen, type Screen } from '@tank-tussle/client-core'

const ROOM_PARAM = 'room'

/**
 * Link that opens the join flow for a room on the public website, or null when this build
 * does not know a public address (a native app built without VITE_PUBLIC_URL).
 */
export const inviteLink = (roomId: string): string | null => {
  const base = publicWebUrl()
  if (!base) return null
  const url = new URL(base)
  url.search = new URLSearchParams({ [ROOM_PARAM]: roomId.toUpperCase() }).toString()
  url.hash = ''
  return url.toString()
}

/**
 * Picks the first screen: an invite link goes to setup, a remembered seat resumes the game.
 * Runs once at startup (outside React) so no duplicate connections are opened.
 */
export const bootScreen = (dependencies: Dependencies): Screen => {
  const params = new URLSearchParams(window.location.search)
  const joinCode = params.get(ROOM_PARAM)
  if (joinCode) {
    params.delete(ROOM_PARAM)
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    return { name: 'setup', mode: 'online', joinCode }
  }
  if (dependencies.credentials.load()) {
    return { name: 'resuming', connection: dependencies.openConnection() }
  }
  return initialScreen
}
