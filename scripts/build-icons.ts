// Renders public/icon.svg into the PNG sizes the PWA and iOS need. Run with: npm run build:icons

import { Resvg } from '@resvg/resvg-js'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pub = join(dirname(fileURLToPath(import.meta.url)), '../public')
const svg = readFileSync(join(pub, 'icon.svg'), 'utf8')

const render = (size: number, file: string) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(join(pub, file), png)
  console.log(`${file} (${size}×${size})`)
}

render(192, 'pwa-192.png')
render(512, 'pwa-512.png')
// The design is full-bleed with the moon inside the safe zone, so it also works as maskable.
render(512, 'pwa-maskable-512.png')
render(180, 'apple-touch-icon.png')
copyFileSync(join(pub, 'icon.svg'), join(pub, 'favicon.svg'))
