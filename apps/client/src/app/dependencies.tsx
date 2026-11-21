import { createDefaultWeaponRegistry, type WeaponRegistry } from '@tank-tussle/game-core'
import { createContext, useContext, type ReactNode } from 'react'
import { H5GamesAds } from '../ads/h5-games-ads.js'
import { WebAudioService } from '../audio/web-audio-service.js'
import {
  AudioSettingsStore,
  connectGameSocket,
  LadderStore,
  MatchAdBreaks,
  noAds,
  OnlineConnection,
  ProfileStore,
  type AdService,
  type AudioService,
  type CredentialsStore,
} from '@tank-tussle/client-core'
import { isNativeApp } from '../shared/platform.js'
import {
  browserStorage,
  persistentCredentialsStore,
  serverUrl,
  sessionCredentialsStore,
} from '../shared/web-storage.js'

/** Services the UI depends on. Swap them in tests or for other back ends. */
export interface Dependencies {
  readonly registry: WeaponRegistry
  readonly credentials: CredentialsStore
  readonly openConnection: () => OnlineConnection
  readonly audio: AudioService
  readonly adBreaks: MatchAdBreaks
  readonly profile: ProfileStore
  readonly ladder: LadderStore
}

/** Ads run only on the open web and only when a publisher id is configured. */
const createAds = (audio: AudioService): AdService => {
  const publisherId = import.meta.env.VITE_ADSENSE_CLIENT
  if (!publisherId || isNativeApp()) return noAds
  return new H5GamesAds(publisherId, {
    onAdOpened: () => audio.setInterrupted(true),
    onAdClosed: () => audio.setInterrupted(false),
  })
}

export const createDependencies = (): Dependencies => {
  const credentials = isNativeApp() ? persistentCredentialsStore : sessionCredentialsStore
  const audio = new WebAudioService(new AudioSettingsStore(browserStorage))
  return {
    registry: createDefaultWeaponRegistry(),
    credentials,
    openConnection: () => new OnlineConnection(connectGameSocket(serverUrl()), credentials),
    audio,
    adBreaks: new MatchAdBreaks(createAds(audio)),
    profile: new ProfileStore(browserStorage),
    ladder: new LadderStore(browserStorage),
  }
}

const DependenciesContext = createContext<Dependencies | null>(null)

export const DependenciesProvider = ({
  value,
  children,
}: {
  value: Dependencies
  children: ReactNode
}) => <DependenciesContext.Provider value={value}>{children}</DependenciesContext.Provider>

export const useDependencies = (): Dependencies => {
  const dependencies = useContext(DependenciesContext)
  if (!dependencies) throw new Error('useDependencies must be used inside DependenciesProvider')
  return dependencies
}
