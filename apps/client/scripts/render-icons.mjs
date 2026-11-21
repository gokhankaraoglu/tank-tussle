// Renders the web app icons from the shared logo (apps/mobile/assets/logo.svg).
// Run after changing the logo: `npm run icons -w @tank-tussle/client`.
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const logo = fileURLToPath(new URL('../../mobile/assets/logo.svg', import.meta.url))
const out = (name) => fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url))
const background = { r: 11, g: 16, b: 38, alpha: 1 }

/** The logo on the game's dark background; `inset` leaves room for masks that crop the edges. */
const render = async (name, size, inset) => {
  const inner = Math.round(size * (1 - inset * 2))
  const art = await sharp(logo, { density: 300 }).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toFile(out(name))
}

await render('icon-192.png', 192, 0.06)
await render('icon-512.png', 512, 0.06)
await render('maskable-512.png', 512, 0.16)
await render('apple-touch-icon.png', 180, 0.08)
console.log('Rendered public/icons/*')
