import type { AdLifecycle, AdPlacement, AdService } from '@tank-tussle/client-core'

/** The ad placement API of Google's "H5 Games Ads" (AdSense for games). */
interface AdBreakRequest {
  readonly type: 'next'
  readonly name: string
  readonly beforeAd: () => void
  readonly afterAd: () => void
  /** Always called, whether or not an ad was shown. */
  readonly adBreakDone: () => void
}

type AdCommand = { preloadAdBreaks: 'on'; sound: 'on' | 'off' } | AdBreakRequest

interface AdsWindow {
  adsbygoogle?: AdCommand[]
}

const SCRIPT_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
/** If the ad script never answers (ad blocker, offline), the game carries on after this. */
const GIVE_UP_MS = 4000

/**
 * Full-screen ads on the web through Google's H5 Games Ads. Consent (GDPR, KVKK) is collected
 * by Google's own message, configured in the AdSense account under "Privacy & messaging".
 */
export class H5GamesAds implements AdService {
  private readonly queue: AdCommand[]

  constructor(
    publisherId: string,
    private readonly lifecycle: AdLifecycle,
  ) {
    const host = window as AdsWindow
    host.adsbygoogle ??= []
    this.queue = host.adsbygoogle
    const script = document.createElement('script')
    script.async = true
    script.src = `${SCRIPT_URL}?client=${encodeURIComponent(publisherId)}`
    script.crossOrigin = 'anonymous'
    // Tells Google how often the game will ask for an ad, so it can preload sensibly.
    script.dataset.adFrequencyHint = '120s'
    document.head.append(script)
    this.queue.push({ preloadAdBreaks: 'on', sound: 'on' })
  }

  showInterstitial(placement: AdPlacement): Promise<void> {
    return new Promise((resolve) => {
      let opened = false
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        window.clearTimeout(timer)
        if (opened) this.lifecycle.onAdClosed()
        resolve()
      }
      const timer = window.setTimeout(finish, GIVE_UP_MS)
      this.queue.push({
        type: 'next',
        name: placement,
        beforeAd: () => {
          // An ad is really on screen: wait for it however long it takes.
          window.clearTimeout(timer)
          opened = true
          this.lifecycle.onAdOpened()
        },
        afterAd: finish,
        adBreakDone: finish,
      })
    })
  }
}
