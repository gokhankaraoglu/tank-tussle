import type { PlayerProfile } from '@tank-tussle/game-core'
import { useSyncExternalStore } from 'react'
import type { LadderStore } from '../ladder/ladder.js'
import type { ProfileStore } from '../profile/profile-store.js'

export const useProfile = (store: ProfileStore): PlayerProfile =>
  useSyncExternalStore(store.subscribe, store.get)

/** The highest ladder level beaten so far; re-renders when the player climbs. */
export const useLadderProgress = (store: LadderStore): number =>
  useSyncExternalStore(store.subscribe, store.getBeaten)
