// Builds src/data/generated/drops.json: average drops per run from paimon.moe
// (genshin-db has none). Run with: npm run build:drop-data

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DropData } from '../src/data/types.ts'

const URL_ = 'https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/dropRates.js'

const res = await fetch(URL_)
if (!res.ok) throw new Error(`${res.status} fetching ${URL_}`)
// `export const dropRates = { book: [[…]], weapon: [[…]], boss: [[…]] };` — plain numbers only.
const body = (await res.text())
  .replace(/^[\s\S]*?=\s*/, '')
  .replace(/;\s*$/, '')
  .replace(/(\w+):/g, '"$1":')
  .replace(/,(\s*[\]}])/g, '$1')
const rates = JSON.parse(body) as { book: number[][]; weapon: number[][]; boss: number[][] }

const data: DropData = {
  source: 'paimon.moe (github.com/MadeBaruna/paimon-moe) src/data/dropRates.js',
  talentDomain: rates.book,
  weaponDomain: rates.weapon,
  worldBoss: rates.boss,
}

const out = join(dirname(fileURLToPath(import.meta.url)), '../src/data/generated/drops.json')
writeFileSync(out, JSON.stringify(data) + '\n')
console.log(
  'drop rates: talent IV',
  rates.book[3],
  'weapon IV',
  rates.weapon[3],
  'boss WL8',
  rates.boss[8],
)
