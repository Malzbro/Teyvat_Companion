// Builds src/data/generated/reactions.json from Genshin Optimizer (approved source, Step 19):
// the reaction level multipliers (the game's PlayerElementLevelCo table), the reaction multipliers,
// and the Moonsign team bonus rates. genshin-db has none of these. Run with: npm run build:reaction-data

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const GO = 'https://raw.githubusercontent.com/frzyc/genshin-optimizer/master'
const SOURCES = {
  consts: `${GO}/libs/gi/keymap/src/StatConstants.ts`,
  dataUtil: `${GO}/libs/gi/sheets/src/Characters/dataUtil.tsx`,
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function get(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  return res.text()
}

const [consts, dataUtil] = await Promise.all(Object.values(SOURCES).map(get))

function numberList(src: string, name: string): number[] {
  const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\]`))
  if (!m) throw new Error(`Couldn't find ${name}`)
  return m[1]
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, '').trim().replace(/,$/, ''))
    .filter(Boolean)
    .map(Number)
}

/** `key: { name: 'X', multi: 1.15` inside one of GO's reaction tables. */
function multi(key: string): number {
  const m = consts.match(new RegExp(`\\b${key}: \\{\\s*name: '[^']+',\\s*multi: ([\\d.]+)`))
  if (!m) throw new Error(`Couldn't find the ${key} multiplier`)
  return Number(m[1])
}

const levelMultiplier = numberList(consts, 'transformativeReactionLevelMultipliers')
if (levelMultiplier.length < 91 || levelMultiplier.some((v, i) => i > 0 && !(v > 0)))
  throw new Error('Level multiplier table looks wrong')

// Moonsign (Ascendant Gleam): a non-Moonsign member's Lunar DMG bonus from one of their stats.
const rate = (elements: string) => {
  const m = dataUtil.match(
    new RegExp(`${elements}\\s*moonsignBase = prod\\(input\\.total\\.(\\w+), 1 / (\\d+), percent\\(([\\d.]+)\\)\\)`),
  )
  if (!m) throw new Error(`Couldn't find the Moonsign rate for ${elements}`)
  return { stat: m[1], per: Number(m[2]), value: Number(m[3]) }
}
const cap = dataUtil.match(/min\(value, percent\(([\d.]+)\)\)/)
if (!cap) throw new Error("Couldn't find the Moonsign cap")

const data = {
  source: 'Genshin Optimizer (github.com/frzyc/genshin-optimizer): libs/gi/keymap StatConstants, libs/gi/sheets dataUtil',
  /** Index = character level. */
  levelMultiplier,
  additive: { aggravate: multi('aggravate'), spread: multi('spread') },
  transformative: { swirl: multi('swirl'), stellarswirl: multi('stellarswirl') },
  moonsign: {
    cap: Number(cap[1]),
    rates: {
      Pyro: rate("case 'pyro':\\s*case 'electro':\\s*case 'cryo':"),
      Electro: rate("case 'pyro':\\s*case 'electro':\\s*case 'cryo':"),
      Cryo: rate("case 'pyro':\\s*case 'electro':\\s*case 'cryo':"),
      Hydro: rate("case 'hydro':"),
      Geo: rate("case 'geo':"),
      Anemo: rate("case 'anemo':\\s*case 'dendro':"),
      Dendro: rate("case 'anemo':\\s*case 'dendro':"),
    },
  },
}

writeFileSync(join(root, 'src/data/generated/reactions.json'), JSON.stringify(data) + '\n')
console.log({ ...data, levelMultiplier: `${levelMultiplier.length} levels; Lv 90 = ${levelMultiplier[90]}` })
