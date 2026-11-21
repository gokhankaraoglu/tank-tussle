import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Set TANK_TUSSLE_LOCAL_SERVER=1 when syncing a build that talks to a game server on your
 * computer over plain HTTP (e.g. VITE_SERVER_URL=http://10.0.2.2:5001 for the Android
 * emulator). Android serves the app from https://localhost and would otherwise block it.
 */
const localServer = process.env.TANK_TUSSLE_LOCAL_SERVER === '1'

/**
 * The native apps are thin shells: they load the built web client from `apps/client/dist`.
 * All game code stays in the client and the shared packages.
 */
const config: CapacitorConfig = {
  appId: 'com.gokhankaraoglu.tanktussle',
  appName: 'Tank Tussle',
  webDir: '../client/dist',
  backgroundColor: '#070b1d',
  ios: {
    // The web layout handles the notch itself with CSS safe-area insets.
    contentInset: 'never',
  },
  android: {
    allowMixedContent: localServer,
  },
}

export default config
