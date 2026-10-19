// Builds src/data/generated/artifact-stats.json from Genshin Optimizer's game-data-derived tables.
// genshin-db has no artifact roll/main-stat data. Run with: npm run build:artifact-data

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ArtifactStatsData, StatKey } from '../src/data/types.ts'

const GO = 'https://raw.githubusercontent.com/frzyc/genshin-optimizer/master'
const SOURCES = {
  main: `${GO}/libs/gi/stats/Data/Artifacts/artifact_main.json`,
  subRolls: `${GO}/libs/gi/stats/Data/Artifacts/artifact_sub_rolls.json`,
  correction: `${GO}/libs/gi/stats/Data/Artifacts/artifact_sub_rolls_correction.json`,
  consts: `${GO}/libs/gi/consts/src/artifact.ts`,
  // Main-stat and substat odds (GO cites the Genshin wiki's artifact distribution), Step 21.
  odds: `${GO}/libs/gi/upopt/src/consts.ts`,
}

const RARITIES = [3, 4, 5] as const
const PERCENT = (key: string) => key.endsWith('_')

async function get(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  return res.text()
}

/** Reads `export const name = [ 'a', 'b' ] as const` or a `{ n: 4, … }` record out of GO's TS source. */
function tsArray(src: string, name: string): string[] {
  const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`))
  if (!m) throw new Error(`Couldn't find ${name} in GO consts`)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

const [mainJson, subJson, corrJson, consts, odds] = await Promise.all(
  Object.values(SOURCES).map(get),
)
const main = JSON.parse(mainJson) as Record<string, Record<string, number[]>>
const subRolls = JSON.parse(subJson) as Record<string, Record<string, Record<string, number[][]>>>
const correction = JSON.parse(corrJson) as Record<string, Record<string, Record<string, string>>>

/** `export const name = { key: 80 / 300, … }` → { key: 0.2667 }. */
function oddsTable(name: string): Partial<Record<StatKey, number>> {
  const m = odds.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\}`))
  if (!m) throw new Error(`Couldn't find ${name} in GO upopt consts`)
  const out: Partial<Record<StatKey, number>> = {}
  for (const row of m[1].matchAll(/(\w+):\s*([\d.]+)(?:\s*\/\s*([\d.]+))?/g))
    out[row[1] as StatKey] = Number(row[2]) / (row[3] ? Number(row[3]) : 1)
  return out
}

const maxLevelSrc = consts.match(/artMaxLevel[^=]*=\s*\{([\s\S]*?)\}/)![1]
const rollSrc = consts.match(/artSubstatRollData[^=]*=\s*\{([\s\S]*?)\} as const/)![1]

const data: ArtifactStatsData = {
  source: 'Genshin Optimizer (github.com/frzyc/genshin-optimizer), libs/gi/stats + libs/gi/consts',
  rarities: [...RARITIES],
  maxLevel: {},
  substatCount: {},
  slotMainStats: {
    flower: ['hp'],
    plume: ['atk'],
    sands: tsArray(consts, 'artifactSandsStatKeys') as StatKey[],
    goblet: tsArray(consts, 'artifactGobletStatKeys') as StatKey[],
    circlet: tsArray(consts, 'artifactCircletStatKeys') as StatKey[],
  },
  substatKeys: tsArray(consts, 'allSubstatKeys') as StatKey[],
  mainValues: {},
  subTiers: {},
  subValues: {},
  mainStatOdds: {
    flower: oddsTable('FlowerMainStatProbs'),
    plume: oddsTable('PlumeMainStatProbs'),
    sands: oddsTable('SandsMainStatProbs'),
    goblet: oddsTable('GobletMainStatProbs'),
    circlet: oddsTable('CircletMainStatProbs'),
  },
  substatWeights: oddsTable('substatWeights'),
}

for (const r of RARITIES) {
  data.maxLevel[r] = Number(maxLevelSrc.match(new RegExp(`${r}:\\s*(\\d+)`))![1])
  const roll = rollSrc.match(new RegExp(`${r}:\\s*\\{\\s*low:\\s*(\\d+),\\s*high:\\s*(\\d+)`))!
  data.substatCount[r] = { low: Number(roll[1]), high: Number(roll[2]) }
  data.mainValues[r] = main[r] as Record<StatKey, number[]>

  data.subTiers[r] = {}
  data.subValues[r] = {}
  for (const [stat, byValue] of Object.entries(subRolls[r])) {
    const key = stat as StatKey
    const fix = correction[r]?.[stat] ?? {}
    const tiers: number[] = []
    const values: Record<string, number> = {}
    for (const [display, combos] of Object.entries(byValue)) {
      const shown = fix[display] ?? display
      const minRolls = Math.min(...combos.map((c) => c.length))
      values[shown] = Math.min(values[shown] ?? Infinity, minRolls)
      if (minRolls === 1) tiers.push(Number(shown))
    }
    // Stored as fractions for % stats, like everywhere else in the app.
    data.subTiers[r][key] = tiers
      .sort((a, b) => a - b)
      .map((v) => (PERCENT(stat) ? Number((v / 100).toFixed(6)) : v))
    data.subValues[r][key] = values
  }
}

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/generated/artifact-stats.json',
)
writeFileSync(out, JSON.stringify(data) + '\n')
console.log(
  `artifact stats: rarities ${RARITIES.join('/')}, max levels`,
  data.maxLevel,
  '5★ CRIT Rate tiers',
  data.subTiers[5].critRate_,
)
