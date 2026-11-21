# Monetization (ads)

The game can show full-screen ads **between matches**. Nothing is shown until an ad network is
configured, so the code below is inert in a default build.

## How it is built

```
MatchScreen ── "Play again" / "Main menu" after a finished match
     │
     ▼
MatchAdBreaks (client-core)   decides whether this match gets an ad
     │
     ▼
AdService (client-core)       showInterstitial('match-end')
     ├── noAds                default: resolves at once
     ├── H5GamesAds           web: Google H5 Games Ads (apps/client/src/ads)
     └── (AdMob adapter)      native: not written yet, see below
```

- **`AdService`** is the only thing the UI knows. It never rejects: a blocked or missing ad
  resolves straight away, so an ad problem can never stop the game.
- **`MatchAdBreaks`** holds the policy (`DEFAULT_AD_BREAK_POLICY`): an ad after every second
  finished match, never in online matches (an ad on one device would keep the opponent waiting)
  and never in practice. Change the policy in one place; it has tests.
- **Audio** goes quiet while an ad is open: adapters call `AudioService.setInterrupted`.
- **Never during a battle.** Ads only appear when the player leaves a finished match. Banners on
  the battlefield cause accidental clicks, which ad networks penalise.

## Web: Google H5 Games Ads

1. Get an AdSense account approved for the game's domain and enable H5 Games Ads.
2. Set the publisher id at build time (in `netlify.toml` or `apps/client/.env`):
   ```
   VITE_ADSENSE_CLIENT=ca-pub-0000000000000000
   ```
3. Publish `ads.txt` at the site root (`apps/client/public/ads.txt`) with the line AdSense
   gives you.
4. In AdSense → _Privacy & messaging_, enable the consent message for the regions you serve
   (GDPR, and KVKK for Turkey). Google shows it; the game needs no consent code of its own.
5. Publish a privacy policy page and link it from the main menu.

The adapter has not been run against a live AdSense account yet: test it with AdSense's test
mode (`data-adbreak-test="on"` on the script) before going live.

Alternative: game portals (CrazyGames, Poki) bring their own traffic and SDK. Supporting one
means writing another small `AdService` adapter next to `h5-games-ads.ts`.

## Native: AdMob (not wired in yet)

`apps/native` uses `noAds`. To add AdMob:

1. `npx expo install react-native-google-mobile-ads` and add its config plugin to `app.json`
   with the Android and iOS AdMob app ids (the app crashes at launch without them).
2. Write `apps/native/src/platform/admob-ads.ts` implementing `AdService` with an
   `InterstitialAd`: load one ahead of time, show it in `showInterstitial`, resolve on the
   `CLOSED` or `ERROR` event, and call `audio.setInterrupted` around it.
3. Pass it to `new MatchAdBreaks(...)` in `apps/native/src/app/dependencies.tsx`.
4. Ask for consent with the UMP SDK (`AdsConsent` in the same package) before the first ad, and
   show Apple's tracking prompt (`expo-tracking-transparency`) on iOS.
5. Publish `app-ads.txt` on the developer website listed in the stores.
6. Fill in the App Store privacy labels and the Google Play data-safety form, and declare that
   the app contains ads.

## Before earning money

- The game has its own name (Tank Tussle), logo, weapon names, icons, sounds and music. Before
  publishing, check that the name is free in the stores and in the trademark registers
  (TÜRKPATENT, EUIPO, USPTO; classes 9 and 41).
- Developer accounts: Apple (99 USD / year), Google Play (25 USD once), AdSense / AdMob with tax
  and payment details.

## Ideas for later

- Rewarded ads (the player chooses to watch) for something cosmetic or for local modes only;
  never for an advantage in online matches. Add a `showRewarded` method to `AdService` then.
- A "remove ads" in-app purchase on mobile.
