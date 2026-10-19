// Builds src/data/generated/buffs.json: the numbers behind the team buffs the Optimise screen
// counts (Bennett, Furina, Xilonen, Yelan), read from genshin-db talent tables. Nothing is typed in
// by hand: if genshin-db renames a label, this script stops instead of guessing.
// Run with: npm run build:buff-data
/* eslint-disable @typescript-eslint/no-explicit-any -- genshin-db raw data is untyped */

import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const genshinDb: any = require('genshin-db')
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Per-talent-level values of the parameter whose label starts with `label`. */
function series(character: string, talent: string, label: string): number[] {
  const t = genshinDb.talents(character)?.[talent]
  if (!t) throw new Error(`${character} ${talent} not found in genshin-db`)
  const labels: string[] = t.attributes.labels
  const row = labels.find((l) => l.startsWith(`${label}|`))
  const param = row && /\{(param\d+)/.exec(row)?.[1]
  if (!param)
    throw new Error(`${character} ${talent}: no "${label}" label in ${labels.join(' / ')}`)
  return t.attributes.parameters[param]
}

/** A number written in a passive's text, e.g. "The maximum increase to DMG dealt is 50%". */
function fromText(character: string, talent: string, pattern: RegExp): number {
  const text: string = genshinDb.talents(character)?.[talent]?.description ?? ''
  const m = pattern.exec(text)
  if (!m) throw new Error(`${character} ${talent}: text no longer matches ${pattern}`)
  return Number(m[1]) / 100
}

const data = {
  source: `genshin-db ${require('genshin-db/package.json').version}`,
  bennett: {
    /** Burst (Fantastic Voyage): ATK bonus as a fraction of Bennett's Base ATK, by burst level. */
    burstAtkRatio: series('Bennett', 'combat3', 'ATK Bonus Ratio'),
  },
  furina: {
    /** Burst (Let the People Rejoice): most Fanfare she can hold, by burst level. */
    burstMaxFanfare: series('Furina', 'combat3', 'Maximum Fanfare'),
    /** DMG Bonus to every party member per point of Fanfare, by burst level. */
    burstDmgPerFanfare: series('Furina', 'combat3', 'Fanfare to DMG Increase Conversion Ratio'),
  },
  xilonen: {
    /** Skill (Yohual's Scratch): Elemental RES decrease from an active Source Sample. */
    skillResShred: series('Xilonen', 'combat2', 'Elemental RES Decrease'),
  },
  yelan: {
    /** Passive 2 (Adapt With Ease): highest DMG bonus the active character gets. */
    a4MaxDmg: fromText('Yelan', 'passive2', /maximum increase to DMG dealt is (\d+)%/i),
  },
}

writeFileSync(join(root, 'src/data/generated/buffs.json'), JSON.stringify(data) + '\n')
console.log(JSON.stringify(data, null, 1))
