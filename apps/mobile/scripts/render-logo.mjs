// Renders assets/logo.svg to the PNGs @capacitor/assets needs (icon + splash source).
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const asset = (name) => fileURLToPath(new URL(`../assets/${name}`, import.meta.url))

for (const name of ['logo.png', 'logo-dark.png']) {
  await sharp(asset('logo.svg'), { density: 300 }).resize(1024, 1024).png().toFile(asset(name))
}
console.log('Rendered assets/logo.png and assets/logo-dark.png')
