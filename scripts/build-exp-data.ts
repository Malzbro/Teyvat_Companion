// Builds src/data/generated/exp.json: level-up EXP tables from paimon.moe
// (genshin-db has none). Run with: npm run build:exp-data

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExpData } from '../src/data/types.ts'

const PM = 'https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src'

async function jsArray(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  // Files look like `export const characterExp = [ … ];` (plain numbers only).
  const body = (await res.text()).replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, '')
  return JSON.parse(body.replace(/,(\s*[\]}])/g, '$1'))
}

const character = (await jsArray(`${PM}/data/characterExp.js`)) as number[]
const weapon = (await jsArray(`${PM}/data/weaponExp.js`)) as number[][]

if (character.length !== 90 || weapon.length !== 3) throw new Error('Unexpected EXP table shape')

const data: ExpData = {
  source:
    'paimon.moe (github.com/MadeBaruna/paimon-moe): src/data/characterExp.js, weaponExp.js; ' +
    'Mora = EXP ÷ 5 (characters) and ÷ 10 (weapons), as in its calculator',
  character,
  weapon: { 3: weapon[0], 4: weapon[1], 5: weapon[2] },
  moraPerExp: { character: 1 / 5, weapon: 1 / 10 },
}

const out = join(dirname(fileURLToPath(import.meta.url)), '../src/data/generated/exp.json')
writeFileSync(out, JSON.stringify(data) + '\n')
console.log(`EXP tables: character Lv 1→90 = ${character[89].toLocaleString()} EXP`)
