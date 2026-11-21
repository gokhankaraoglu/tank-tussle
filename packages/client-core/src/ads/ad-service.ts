/** Where in the game an ad is shown; ad networks report earnings per placement. */
export type AdPlacement = 'match-end'

/**
 * Full-screen ads between matches. The UI and the rules never know which ad network is behind
 * it: the web and the native app each provide an adapter, and builds without ads use `noAds`.
 */
export interface AdService {
  /**
   * Shows a full-screen ad if one is ready and resolves when the player is back in the game.
   * Never rejects: a missing, blocked or failed ad simply resolves straight away.
   */
  showInterstitial(placement: AdPlacement): Promise<void>
}

/** What an adapter must do around every ad: the game goes quiet while it is on screen. */
export interface AdLifecycle {
  onAdOpened(): void
  onAdClosed(): void
}

/** For builds without ads, and for tests. */
export const noAds: AdService = {
  showInterstitial: () => Promise.resolve(),
}
