import type { SessionSnapshot } from '../session/game-session.js'
import type { AdService } from './ad-service.js'

/** The kinds of match the ad policy tells apart. */
export type MatchKind = 'local' | 'online' | 'practice'

export const matchKindOf = (snapshot: SessionSnapshot): MatchKind => {
  if (snapshot.presence !== null) return 'online'
  return snapshot.state.config.mode === 'practice' ? 'practice' : 'local'
}

export interface AdBreakPolicy {
  /** Show an ad after every n-th finished match (2 = every second match). */
  readonly everyMatches: number
  /**
   * Kinds of match that never get an ad. Online matches are excluded by default: an ad on one device
   * would keep the opponent waiting for the rematch.
   */
  readonly excludedKinds: readonly MatchKind[]
}

export const DEFAULT_AD_BREAK_POLICY: AdBreakPolicy = {
  everyMatches: 2,
  excludedKinds: ['online', 'practice'],
}

/**
 * Decides when a finished match is followed by an ad, so players are never interrupted during
 * a battle and not after every single game. One instance lives for the whole app session.
 */
export class MatchAdBreaks {
  private finishedMatches = 0

  constructor(
    private readonly ads: AdService,
    private readonly policy: AdBreakPolicy = DEFAULT_AD_BREAK_POLICY,
  ) {}

  /**
   * Call when the player leaves a finished match (rematch or back to the menu). Resolves once
   * the game may continue, with or without an ad having been shown.
   */
  async afterMatch(kind: MatchKind): Promise<void> {
    if (this.policy.excludedKinds.includes(kind)) return
    this.finishedMatches++
    if (this.finishedMatches % this.policy.everyMatches !== 0) return
    await this.ads.showInterstitial('match-end')
  }
}
