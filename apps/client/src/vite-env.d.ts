/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string
  /** Public address of the web game, used for invite links (required for the native apps). */
  readonly VITE_PUBLIC_URL?: string
  /** AdSense publisher id (`ca-pub-…`). Ads are off when it is not set. */
  readonly VITE_ADSENSE_CLIENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
