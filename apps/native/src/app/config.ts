import { DEFAULT_SERVER_URL } from '@tank-tussle/client-core'

/**
 * Game server address, baked in at build time: set EXPO_PUBLIC_SERVER_URL in `.env`.
 * The default only works in the iOS simulator (it shares the Mac's localhost).
 */
export const serverUrl = (): string => process.env.EXPO_PUBLIC_SERVER_URL ?? DEFAULT_SERVER_URL
