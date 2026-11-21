import {
  AudioSettingsStore,
  connectGameSocket,
  LadderStore,
  MatchAdBreaks,
  noAds,
  OnlineConnection,
  ProfileStore,
  storageCredentialsStore,
  type AudioService,
  type CredentialsStore,
  type KeyValueStorage,
} from '@tank-tussle/client-core'
import { createDefaultWeaponRegistry, type WeaponRegistry } from '@tank-tussle/game-core'
import { createContext, useContext } from 'react'
import { ExpoAudioService } from '../platform/expo-audio-service'
import { serverUrl } from './config'

/** Services the UI depends on. Swap them in tests or for other back ends. */
export interface Dependencies {
  readonly registry: WeaponRegistry
  readonly credentials: CredentialsStore
  readonly openConnection: () => OnlineConnection
  readonly audio: AudioService
  readonly storage: KeyValueStorage
  /** No ad network is wired in yet: see docs/MONETIZATION.md for adding AdMob. */
  readonly adBreaks: MatchAdBreaks
  readonly profile: ProfileStore
  readonly ladder: LadderStore
}

export const createDependencies = (storage: KeyValueStorage): Dependencies => {
  const credentials = storageCredentialsStore(() => storage)
  return {
    registry: createDefaultWeaponRegistry(),
    credentials,
    openConnection: () => new OnlineConnection(connectGameSocket(serverUrl()), credentials),
    audio: new ExpoAudioService(new AudioSettingsStore(() => storage)),
    storage,
    adBreaks: new MatchAdBreaks(noAds),
    profile: new ProfileStore(() => storage),
    ladder: new LadderStore(() => storage),
  }
}

const DependenciesContext = createContext<Dependencies | null>(null)
export const DependenciesProvider = DependenciesContext.Provider

export const useDependencies = (): Dependencies => {
  const dependencies = useContext(DependenciesContext)
  if (!dependencies) throw new Error('useDependencies must be used inside DependenciesProvider')
  return dependencies
}
