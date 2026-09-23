import { describe, expect, it } from 'vitest'
import { getCharacter, getWeapon } from '../../data'
import type { Artifact } from '../../db/types'
import { SET_EFFECTS, computeBuild, type BuildInput } from '.'
import { alwaysOnStat } from './weapons'

const c = (key: string) => getCharacter(key)!

let n = 0
const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'] as const
const MAINS = {
  flower: 'hp',
  plume: 'atk',
  sands: 'atk_',
  goblet: 'atk_',
  circlet: 'critRate_',
} as const
/** `count` pieces of a set (bare substats; only set bonuses matter here). */
const pieces = (setKey: string, count: number): Artifact[] =>
  SLOTS.slice(0, count).map((slot) => ({
    id: `a${n++}`,
    setKey,
    slot,
    rarity: 5,
    level: 20,
    mainStat: MAINS[slot],
    substats: [],
  }))

const build = (patch: Partial<BuildInput>) =>
  computeBuild({
    character: c('xiangling'),
    level: 90,
    ascension: 6,
    artifacts: [],
    teammates: [],
    ...patch,
  })

describe('resonance', () => {
  it('a second Pyro in a full party raises ATK by 25% of base ATK', () => {
    const without = build({ teammates: [c('furina'), c('yelan'), c('xilonen')] })
    const withPyro = build({ teammates: [c('bennett'), c('yelan'), c('xilonen')] })
    const baseAtk = withPyro.stats.base.atk
    expect(withPyro.stats.final.atk - without.stats.final.atk).toBeCloseTo(0.25 * baseAtk, 6)
    expect(withPyro.resonances.map((r) => r.name)).toContain('Fervent Flames')
  })

  it('needs a full party of 4', () => {
    expect(build({ teammates: [c('bennett')] }).resonances).toEqual([])
  })

  it('Hydro adds HP, Cryo/Geo are toggles, Dendro has +50 and two extras', () => {
    const hydro = build({
      character: c('furina'),
      teammates: [c('yelan'), c('bennett'), c('xilonen')],
    })
    expect(hydro.stats.bonus.hp_).toBeCloseTo(0.25, 6)

    const cryo = build({
      character: c('skirk'),
      teammates: [c('citlali'), c('furina'), c('yelan')],
    })
    const cryoOff = build({
      character: c('skirk'),
      teammates: [c('citlali'), c('furina'), c('yelan')],
      conditions: { 'res-cryo': 0 },
    })
    expect(cryo.stats.final.critRate_ - cryoOff.stats.final.critRate_).toBeCloseTo(0.15, 6)

    const geo = build({
      character: c('navia'),
      teammates: [c('xilonen'), c('bennett'), c('furina')],
    })
    expect(geo.dmg.dmg_).toBeCloseTo(0.15, 6)
    expect(geo.notes.some((x) => /enemy Geo RES/.test(x.text))).toBe(true)
  })

  it('Electro/Anemo/Canopy are info only', () => {
    const canopy = build({ teammates: [c('furina'), c('yaemiko'), c('skirk')] })
    expect(canopy.resonances.map((r) => r.name)).toEqual(['Protective Canopy'])
    expect(canopy.applied).toEqual([])
  })
})

describe('artifact sets', () => {
  it('2pc and 4pc only apply with enough pieces, for every supported set', () => {
    for (const key of Object.keys(SET_EFFECTS)) {
      const effect = SET_EFFECTS[key]
      const sources = (count: number) =>
        new Set(build({ artifacts: pieces(key, count) }).applied.map((m) => m.source))
      const tag = (p: string) => [...sources(4)].some((s) => s.endsWith(p))

      expect([...sources(1)], `${key} with 1 piece`).toEqual([])
      if (effect.twoPiece && build({ artifacts: pieces(key, 2) }).applied.length)
        expect(tag('2pc'), `${key} 2pc`).toBe(true)
      expect(
        [...sources(3)].some((s) => s.endsWith('4pc')),
        `${key} 4pc with 3 pieces`,
      ).toBe(false)
    }
  })

  it('Golden Troupe: 20% + 25% + 25% off-field Skill DMG, toggle removes the last', () => {
    const on = build({ artifacts: pieces('goldentroupe', 4) })
    expect(on.dmg.skill_dmg_).toBeCloseTo(0.7, 6)
    const off = build({
      artifacts: pieces('goldentroupe', 4),
      conditions: { 'troupe-offfield': 0 },
    })
    expect(off.dmg.skill_dmg_).toBeCloseTo(0.45, 6)
    expect(build({ artifacts: pieces('goldentroupe', 2) }).dmg.skill_dmg_).toBeCloseTo(0.2, 6)
  })

  it('Emblem 4pc: Burst DMG = 25% of ER, capped at 75%', () => {
    const r = build({ artifacts: pieces('emblemofseveredfate', 4) })
    expect(r.stats.final.enerRech_).toBeCloseTo(1.2, 6) // 100% + 2pc
    expect(r.dmg.burst_dmg_).toBeCloseTo(0.3, 6)
  })

  it('stack conditions scale and cap', () => {
    const three = build({ artifacts: pieces('marechausseehunter', 4) })
    const one = build({
      artifacts: pieces('marechausseehunter', 4),
      conditions: { 'mh-stacks': 1 },
    })
    expect(three.stats.final.critRate_ - one.stats.final.critRate_).toBeCloseTo(0.24, 6)
    const tooMany = build({
      artifacts: pieces('marechausseehunter', 4),
      conditions: { 'mh-stacks': 9 },
    })
    expect(tooMany.stats.final.critRate_).toBeCloseTo(three.stats.final.critRate_, 6)
  })

  it('requires: Crystallize bonus only with the after-Skill bonus', () => {
    const navia = c('navia')
    const both = build({
      character: navia,
      artifacts: pieces('nighttimewhispersintheechoingwoods', 4),
      conditions: { 'whispers-crystallize': 1 },
    })
    expect(both.stats.final.geo_dmg_).toBeCloseTo(0.5, 6)
    const onlyShield = build({
      character: navia,
      artifacts: pieces('nighttimewhispersintheechoingwoods', 4),
      conditions: { 'whispers-crystallize': 1, 'whispers-skill': 0 },
    })
    expect(onlyShield.stats.final.geo_dmg_).toBe(0)
  })

  it('Gilded Dreams counts teammates by element', () => {
    // Xiangling (Pyro) with Bennett (Pyro), Furina and Yelan (Hydro): 1 same, 2 different.
    const r = build({
      artifacts: pieces('gildeddreams', 4),
      teammates: [c('bennett'), c('furina'), c('yelan')],
    })
    const off = build({
      artifacts: pieces('gildeddreams', 4),
      teammates: [c('bennett'), c('furina'), c('yelan')],
      conditions: { 'gilded-reaction': 0 },
    })
    expect(r.stats.final.eleMas - off.stats.final.eleMas).toBe(100)
    expect(r.stats.bonus.atk_ - off.stats.bonus.atk_).toBeCloseTo(0.14, 6)
  })
})

describe('weapon passives (always-on first effect only)', () => {
  it('reads Aqua Simulacra HP and ignores conditional first sentences', () => {
    expect(alwaysOnStat(getWeapon('aquasimulacra')!)?.stat).toBe('hp_')
    expect(alwaysOnStat(getWeapon('azurelight')!)).toBeNull() // "Within 12s after …"
    expect(alwaysOnStat(getWeapon('memoryofdust')!)).toBeNull() // Shield Strength
  })

  it('reproduces her Yelan HP (33,229) through the modifier system', () => {
    const r = computeBuild({
      character: c('yelan'),
      level: 90,
      ascension: 6,
      weapon: { data: getWeapon('aquasimulacra')!, level: 90, ascension: 6, refinement: 4 },
      teammates: [],
      artifacts: [
        {
          id: 'f',
          setKey: 'emblemofseveredfate',
          slot: 'flower',
          rarity: 5,
          level: 20,
          mainStat: 'hp',
          substats: [{ key: 'hp_', value: 0.082 }],
        },
        {
          id: 'p',
          setKey: 'emblemofseveredfate',
          slot: 'plume',
          rarity: 5,
          level: 20,
          mainStat: 'atk',
          substats: [],
        },
        {
          id: 's',
          setKey: 'emblemofseveredfate',
          slot: 'sands',
          rarity: 5,
          level: 20,
          mainStat: 'hp_',
          substats: [{ key: 'hp', value: 299 }],
        },
        {
          id: 'g',
          setKey: 'heartofdepth',
          slot: 'goblet',
          rarity: 5,
          level: 20,
          mainStat: 'hydro_dmg_',
          substats: [{ key: 'hp_', value: 0.087 }],
        },
        {
          id: 'c',
          setKey: 'emblemofseveredfate',
          slot: 'circlet',
          rarity: 5,
          level: 20,
          mainStat: 'critRate_',
          substats: [{ key: 'hp', value: 478 }],
        },
      ],
    })
    expect(Math.abs(r.stats.final.hp - 33229)).toBeLessThanOrEqual(1)
    expect(r.notes.some((x) => x.source.startsWith('Aqua Simulacra'))).toBe(true)
  })
})
