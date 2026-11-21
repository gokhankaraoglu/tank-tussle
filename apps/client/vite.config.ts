import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import { themeCss, tokens } from '@tank-tussle/client-core/theme'

const packageSource = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url))

/**
 * The server URL is baked into the bundle. A production build without it would silently
 * point players at localhost, so CI builds (Netlify sets CI) fail instead.
 */
const assertServerUrl = (mode: string): void => {
  if (mode !== 'production' || loadEnv(mode, process.cwd(), 'VITE_').VITE_SERVER_URL) return
  const message = 'VITE_SERVER_URL is not set; online play will try to reach http://localhost:5001'
  if (process.env.CI) throw new Error(message)
  console.warn(`\n⚠  ${message}\n`)
}

const THEME_MODULE = 'virtual:theme.css'

/**
 * Turns the shared design tokens into a real stylesheet at build time (no flash of unstyled
 * page while JavaScript loads) and fills the theme colour into index.html.
 */
const theme = (): Plugin => ({
  name: 'tank-tussle-theme',
  resolveId: (id) => (id === THEME_MODULE ? `\0${THEME_MODULE}` : undefined),
  load: (id) => (id === `\0${THEME_MODULE}` ? themeCss() : undefined),
  transformIndexHtml: (html) => html.replaceAll('%THEME_COLOR%', tokens.color.background),
})

/**
 * Installable web app: home-screen icon, full screen in landscape, and offline play for the
 * CPU, two-player and practice modes. The game, sounds, music and fonts are cached on first visit.
 */
const pwa = VitePWA({
  registerType: 'autoUpdate',
  // Registered from main.tsx, and only on the web (not inside the native app shells).
  injectRegister: false,
  includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
  manifest: {
    name: 'Tank Tussle',
    short_name: 'Tank Tussle',
    description: "The fastest artillery game you'll ever play.",
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'landscape',
    background_color: tokens.color.background,
    theme_color: tokens.color.background,
    categories: ['games'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2,png}', 'sounds/**/*.{wav,m4a}'],
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
})

export default defineConfig(({ mode }) => {
  assertServerUrl(mode)
  return {
    plugins: [react(), tailwindcss(), theme(), ...(process.env.VITEST ? [] : [pwa])],
    resolve: {
      // The React Native app pins another React; the web bundle must contain exactly one.
      dedupe: ['react', 'react-dom'],
      // Use package sources directly so engine changes hot-reload without a rebuild.
      alias: {
        '@tank-tussle/game-core': packageSource('game-core'),
        '@tank-tussle/protocol': packageSource('protocol'),
        '@tank-tussle/client-core': packageSource('client-core'),
      },
    },
    server: { port: 5173 },
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
