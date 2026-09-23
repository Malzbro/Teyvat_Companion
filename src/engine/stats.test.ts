import { describe, expect, it } from 'vitest'
import { getCharacter, getWeapon } from '../data'
import type { Artifact } from '../db/types'
import { TWO_PIECE_STATS, parseTwoPiece } from './setBonus'
import { computeStats } from './stats'

const furina = getCharacter('furina')!
const splendor = getWeapon('splendoroftranquilwaters')!

let n = 0
const piece = (a: Omit<Artifact, 'id' | 'rarity' | 'level'>): Artifact => ({
  id: `a${n++}`,
  rarity: 5,
  level: 20,
  ...a,
})

describe('2-piece bonuses from set text', () => {
  it('parses every plain stat 2pc', () => {
    expect(TWO_PIECE_STATS).toMatchObject({
      gladiatorsfinale: { key: 'atk_', value: 0.18 },
      emblemofseveredfate: { key: 'enerRech_', value: 0.2 },
      tenacityofthemillelith: { key: 'hp_', value: 0.2 },
      huskofopulentdreams: { key: 'def_', value: 0.3 },
      gildeddreams: { key: 'eleMas', value: 80 },
      archaicpetra: { key: 'geo_dmg_', value: 0.15 },
      heartofdepth: { key: 'hydro_dmg_', value: 0.15 },
      finaleofthedeepgalleries: { key: 'cryo_dmg_', value: 0.15 },
      paleflame: { key: 'physical_dmg_', value: 0.25 },
      bloodstainedchivalry: { key: 'physical_dmg_', value: 0.25 },
      maidenbeloved: { key: 'heal_', value: 0.15 },
      oceanhuedclam: { key: 'heal_', value: 0.15 },
      berserker: { key: 'critRate_', value: 0.12 },
    })
  })

  it('leaves out bonuses that are not stat-screen stats', () => {
    for (const key of [
      'goldentroupe', // Skill DMG
      'noblesseoblige', // Burst DMG
      'marechausseehunter', // Normal/Charged DMG
      'retracingbolide', // Shield strength
      'lavawalker', // RES
      'obsidiancodex', // conditional
      'scrolloftheheroofcindercity', // energy
    ])
      expect(TWO_PIECE_STATS[key], key).toBeUndefined()
    expect(parseTwoPiece('Cryo DMG Bonus +15%')).toEqual({ key: 'cryo_dmg_', value: 0.15 })
  })
})

describe('computeStats', () => {
  it('character + weapon only', () => {
    const { base, final } = computeStats({
      character: furina,
      level: 90,
      ascension: 6,
      weapon: { data: splendor, level: 90, ascension: 6 },
      artifacts: [],
    })
    expect(base.atk).toBeCloseTo(243.96 + 541.83, 1)
    expect(final.hp).toBeCloseTo(15307.39, 1)
    expect(final.atk).toBeCloseTo(785.79, 1)
    expect(final.def).toBeCloseTo(695.54, 1)
    expect(final.critRate_).toBeCloseTo(0.05 + 0.192, 4)
    expect(final.critDMG_).toBeCloseTo(0.5 + 0.882, 3)
    expect(final.enerRech_).toBe(1)
  })

  it('applies % to base only, adds flat after, and counts 2pc bonuses', () => {
    const artifacts = [
      piece({
        setKey: 'goldentroupe',
        slot: 'flower',
        mainStat: 'hp',
        substats: [
          { key: 'critRate_', value: 0.078 },
          { key: 'atk', value: 19 },
          { key: 'hp_', value: 0.053 },
          { key: 'enerRech_', value: 0.065 },
        ],
      }),
      piece({
        setKey: 'goldentroupe',
        slot: 'plume',
        mainStat: 'atk',
        substats: [
          { key: 'critDMG_', value: 0.14 },
          { key: 'hp', value: 299 },
          { key: 'def', value: 23 },
          { key: 'eleMas', value: 23 },
        ],
      }),
      piece({
        setKey: 'tenacityofthemillelith',
        slot: 'sands',
        mainStat: 'hp_',
        substats: [
          { key: 'critRate_', value: 0.039 },
          { key: 'critDMG_', value: 0.078 },
          { key: 'atk_', value: 0.058 },
          { key: 'def_', value: 0.073 },
        ],
      }),
      piece({
        setKey: 'tenacityofthemillelith',
        slot: 'goblet',
        mainStat: 'hydro_dmg_',
        substats: [
          { key: 'critRate_', value: 0.035 },
          { key: 'critDMG_', value: 0.07 },
          { key: 'hp', value: 209 },
          { key: 'enerRech_', value: 0.045 },
        ],
      }),
      piece({
        setKey: 'heartofdepth',
        slot: 'circlet',
        mainStat: 'critDMG_',
        substats: [
          { key: 'critRate_', value: 0.031 },
          { key: 'hp_', value: 0.041 },
          { key: 'atk', value: 14 },
          { key: 'eleMas', value: 16 },
        ],
      }),
    ]
    const { base, bonus, final, setCounts } = computeStats({
      character: furina,
      level: 90,
      ascension: 6,
      weapon: { data: splendor, level: 90, ascension: 6 },
      artifacts,
    })
    expect(setCounts).toEqual({ goldentroupe: 2, tenacityofthemillelith: 2, heartofdepth: 1 })

    // HP% = sands 46.6 + subs 5.3 + 4.1 + Tenacity 2pc 20; flat HP = flower 4780 + 299 + 209.
    expect(bonus.hp_).toBeCloseTo(0.466 + 0.053 + 0.041 + 0.2, 4)
    expect(final.hp).toBeCloseTo(base.hp * (1 + 0.76) + 4780 + 299 + 209, 1)

    // ATK% (5.8) only scales character + weapon base ATK; plume 311 + 19 + 14 added flat.
    expect(final.atk).toBeCloseTo(base.atk * 1.058 + 311 + 19 + 14, 1)
    expect(final.def).toBeCloseTo(base.def * 1.073 + 23, 1)

    expect(final.critRate_).toBeCloseTo(0.242 + 0.078 + 0.039 + 0.035 + 0.031, 4)
    expect(final.critDMG_).toBeCloseTo(1.382 + 0.14 + 0.078 + 0.07 + 0.622, 3)
    expect(final.enerRech_).toBeCloseTo(1 + 0.065 + 0.045, 4)
    expect(final.eleMas).toBe(39)
    // Goblet only; Heart of Depth has 1 piece so no 2pc.
    expect(final.hydro_dmg_).toBeCloseTo(0.466, 4)
  })
})
