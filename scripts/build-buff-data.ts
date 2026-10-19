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

/** A plain number in a passive's text (no ÷ 100), e.g. "Max 3 stacks" → 3, "1,800" → 1800. */
function numberFromText(character: string, talent: string, pattern: RegExp): number {
  const text: string = genshinDb.talents(character)?.[talent]?.description ?? ''
  const m = pattern.exec(text)
  if (!m) throw new Error(`${character} ${talent}: text no longer matches ${pattern}`)
  return Number(m[1].replace(/,/g, ''))
}

/** A percentage in a constellation's text, as a fraction. */
function fromConstellation(character: string, c: string, pattern: RegExp): number {
  const text: string = genshinDb.constellations(character)?.[c]?.description ?? ''
  const m = pattern.exec(text)
  if (!m) throw new Error(`${character} ${c}: text no longer matches ${pattern}`)
  return Number(m[1]) / 100
}

/** Numbers in an artifact set's 2pc/4pc text, as written (percentages not divided). */
function fromSet(name: string, piece: 2 | 4, pattern: RegExp): number[] {
  const set = genshinDb.artifacts(name)
  const text: string = (piece === 2 ? set?.effect2Pc : set?.effect4Pc) ?? ''
  const m = pattern.exec(text)
  if (!m) throw new Error(`${name} ${piece}pc: text no longer matches ${pattern}`)
  return m.slice(1).map((x) => Number(x.replace(/,/g, '')))
}
const pct = (xs: number[]) => xs.map((x) => x / 100)

// One number genshin-db doesn't carry: Phantasm Performance's bonus per Veil of Falsehood
// (Nefer's passive 1), from Genshin Optimizer's datamined skill parameters (approved source).
const GO_NEFER =
  'https://raw.githubusercontent.com/frzyc/genshin-optimizer/master/libs/gi/stats/Data/Characters/Nefer/skillParam.json'
const neferParams = await fetch(GO_NEFER).then((r) => {
  if (!r.ok) throw new Error(`${r.status} fetching ${GO_NEFER}`)
  return r.json() as Promise<{ passive1: number[][]; passive3: number[][] }>
})

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

  // --- Step 19 ---------------------------------------------------------------
  faruzan: {
    /** Burst: Anemo DMG Bonus to the party, by burst level. */
    burstAnemoDmg: series('Faruzan', 'combat3', 'Anemo DMG Bonus'),
    /** Burst: enemy Anemo RES decrease, by burst level. */
    burstAnemoShred: series('Faruzan', 'combat3', 'Anemo RES Decrease'),
    /** Passive 2 (Hurricane Guard): flat DMG on Anemo hits, as a fraction of her Base ATK. */
    a4BaseAtk: fromText('Faruzan', 'passive2', /based on (\d+)% of Faruzan's Base ATK/),
    /** C6: CRIT DMG on Anemo DMG for characters with Prayerful Wind's Benefit. */
    c6AnemoCritDmg: fromConstellation('Faruzan', 'c6', /have (\d+)% increased CRIT DMG/),
  },
  lynette: {
    /** Passive 1: party ATK by 1/2/3/4 element types. */
    a1Atk: pct(
      /(\d+)%\/(\d+)%\/(\d+)%\/(\d+)%/
        .exec(genshinDb.talents('Lynette').passive1.description)!
        .slice(1)
        .map(Number),
    ),
  },
  candace: {
    /** Burst: Elemental DMG Bonus on Normal Attacks, by burst level. */
    burstNormalDmg: series('Candace', 'combat3', 'DMG Bonus'),
    /** Passive 2: extra Normal Attack Elemental DMG per 1,000 Max HP of Candace. */
    a4PerThousandHp: fromText('Candace', 'passive2', /([\d.]+)% increased DMG to opponents for every 1,000/),
  },
  lisa: {
    /** Passive 2: enemy DEF decrease from Lightning Rose. */
    a4DefShred: fromText('Lisa', 'passive2', /DEF decreased by (\d+)%/),
  },
  clorinde: {
    /** Passive 1: Electro NA/Burst DMG + ATK × this, per stack. */
    a1AtkPerStack: fromText('Clorinde', 'passive1', /increased by (\d+)% of Clorinde's ATK/),
    a1MaxStacks: numberFromText('Clorinde', 'passive1', /Max (\d+) stacks/),
    a1Cap: numberFromText('Clorinde', 'passive1', /achievable this way for the above attacks is ([\d,]+)/),
    /** Passive 2: CRIT Rate per stack with Bond of Life ≥ 100%. */
    a4CritRate: fromText('Clorinde', 'passive2', /CRIT Rate will increase by (\d+)%/),
    a4MaxStacks: numberFromText('Clorinde', 'passive2', /Max (\d+) stacks/),
  },
  fischl: {
    /** Passive 2: Thundering Retribution, Electro DMG = this × Fischl's ATK. */
    a4AtkRatio: fromText('Fischl', 'passive2', /equal to (\d+)% of Fischl's ATK/),
  },
  vesna: {
    /** Passive 2 (with Radiance: Stellar Swirl): ATK per Cryo/Anemo member, EM per other. */
    a4AtkPerCryoAnemo: fromText('Vesna', 'passive2', /ATK increases by (\d+)%/),
    a4EmPerOther: numberFromText('Vesna', 'passive2', /Elemental Mastery increases by (\d+)/),
    /** Passive 3: Stellar Swirl Base DMG + this per 100 of Vesna's ATK, up to the max. */
    a0BaseDmgPer100Atk: fromText('Vesna', 'passive3', /Every 100 ATK she has increases the Base Stellar Swirl DMG by ([\d.]+)%/),
    a0BaseDmgMax: fromText('Vesna', 'passive3', /maximum DMG increase that can be gained this way is (\d+)%/),
  },
  travelercryo: {
    a0BaseDmgPer100Atk: fromText('Traveler (Cryo)', 'passive3', /increased by ([\d.]+)% for every 100 points of the Traveler's ATK/),
    a0BaseDmgMax: fromText('Traveler (Cryo)', 'passive3', /maximum ([\d.]+)% increase/),
  },
  nefer: {
    /** Passive 1: Elemental Mastery at 3 Veils of Falsehood. */
    a1VeilEm: numberFromText('Nefer', 'passive1', /Elemental Mastery will be increased by (\d+)/),
    a1MaxVeils: neferParams.passive1[0][0],
    /** Passive 1: Phantasm Performance DMG per Veil (Genshin Optimizer). */
    a1PhantasmPerVeil: neferParams.passive1[5][0],
    /** Passive 3: Lunar-Bloom Base DMG per point of Nefer's EM, up to the max. */
    a0BaseDmgPerEm: fromText('Nefer', 'passive3', /increasing Lunar-Bloom's Base DMG by ([\d.]+)%/),
    a0BaseDmgMax: fromText('Nefer', 'passive3', /up to a maximum of (\d+)%/),
  },
  sets: {
    /** Scarletproof 4pc: CRIT Rate and Stellar Swirl DMG after triggering Stellar Swirl. */
    scarletproof: pct(fromSet('Scarletproof', 4, /CRIT Rate by (\d+)%, and their Stellar Swirl reaction DMG dealt by (\d+)%/)),
    /** Viridescent Venerer 4pc: Swirl DMG, Stellar Swirl DMG, RES decrease. */
    viridescent: pct(fromSet('Viridescent Venerer', 4, /Swirl reaction DMG dealt by (\d+)%, and Stellar Swirl reaction DMG dealt by (\d+)%\. Decreases opponent's Elemental RES to the element infused in the Swirl by (\d+)%/)),
    /** Deepwood Memories 4pc: Dendro RES decrease. */
    deepwood: pct(fromSet('Deepwood Memories', 4, /Dendro RES will be decreased by (\d+)%/))[0],
    noblesse: pct(fromSet('Noblesse Oblige', 4, /ATK by (\d+)%/))[0],
    tenacity: pct(fromSet('Tenacity of the Millelith', 4, /ATK of all nearby party members is increased by (\d+)%/))[0],
    /** Thundering Fury 4pc: the DMG Bonus conferred by Aggravate. */
    thunderingFuryAggravate: pct(fromSet('Thundering Fury', 4, /conferred by Aggravate by (\d+)%/))[0],
    /** Night of the Sky's Unveiling 4pc: CRIT Rate (Nascent/Ascendant) and Lunar DMG per Gleaming Moon. */
    nightOfTheSky: pct(fromSet("Night of the Sky's Unveiling", 4, /CRIT Rate by (\d+)%\/(\d+)%[\s\S]*increased by (\d+)% for each different Gleaming Moon/)),
    /** Silken Moon's Serenade 4pc: party EM (Nascent/Ascendant), Lunar DMG per Gleaming Moon. */
    silkenMoon: fromSet("Silken Moon's Serenade", 4, /Elemental Mastery by (\d+)\/(\d+)[\s\S]*increased by (\d+)% for each different Gleaming Moon/),
  },
}

writeFileSync(join(root, 'src/data/generated/buffs.json'), JSON.stringify(data) + '\n')
console.log(JSON.stringify(data, null, 1))
