import { describe, expect, it, vi } from 'vitest'
import type { AdService } from './ad-service.js'
import { MatchAdBreaks } from './match-ad-breaks.js'

const fakeAds = () => {
  const showInterstitial = vi.fn(() => Promise.resolve())
  return { ads: { showInterstitial } satisfies AdService, showInterstitial }
}

describe('MatchAdBreaks', () => {
  it('shows an ad after every second finished match by default', async () => {
    const { ads, showInterstitial } = fakeAds()
    const breaks = new MatchAdBreaks(ads)

    await breaks.afterMatch('local')
    expect(showInterstitial).not.toHaveBeenCalled()
    await breaks.afterMatch('local')
    expect(showInterstitial).toHaveBeenCalledExactlyOnceWith('match-end')
    await breaks.afterMatch('local')
    await breaks.afterMatch('local')
    expect(showInterstitial).toHaveBeenCalledTimes(2)
  })

  it('never shows ads for excluded kinds of match and does not count them', async () => {
    const { ads, showInterstitial } = fakeAds()
    const breaks = new MatchAdBreaks(ads)

    await breaks.afterMatch('online')
    await breaks.afterMatch('online')
    await breaks.afterMatch('practice')
    expect(showInterstitial).not.toHaveBeenCalled()
    await breaks.afterMatch('local')
    expect(showInterstitial).not.toHaveBeenCalled()
  })

  it('follows a custom policy', async () => {
    const { ads, showInterstitial } = fakeAds()
    const breaks = new MatchAdBreaks(ads, { everyMatches: 1, excludedKinds: [] })

    await breaks.afterMatch('online')
    expect(showInterstitial).toHaveBeenCalledOnce()
  })

  it('waits until the ad is closed', async () => {
    let close = () => {}
    const ads: AdService = {
      showInterstitial: () => new Promise<void>((resolve) => (close = resolve)),
    }
    const breaks = new MatchAdBreaks(ads, { everyMatches: 1, excludedKinds: [] })
    let done = false
    const pending = breaks.afterMatch('local').then(() => (done = true))

    await Promise.resolve()
    expect(done).toBe(false)
    close()
    await pending
    expect(done).toBe(true)
  })
})
