import { describe, expect, it } from 'vitest'
import { characterBaseStats, getCharacter, type StatKey } from '../../data'
import { BUFF_DATA } from '../../data/buffs'
import { levelMultiplier, REACTION_DATA } from '../../data/reactions'
import { talentValues } from '../../data/talents'
import { newCharacter } from '../../db/roster'
import type { Artifact } from '../../db/types'
import { amount } from '../modifiers'
import { teamBuffModifiers, type PartyMember } from '../modifiers/teamBuffs'
import { mainStatValue } from '../artifact'
import {
  STELLAR_SWIRLS_BY,
  STELLAR_SWIRL_MULT,
  rotationDamage,
  teamOf,
  type RotationInput,
} from './damage'

const L90 = levelMultiplier(90)
const RES = 0.9 // 10% enemy RES
const DEF = 190 / 390 // level 90 vs level 100

const input = (
  key: string,
  teammates: string[],
  patch: Partial<RotationInput> = {},
): RotationInput => ({
  characterKey: key,
  level: 90,
  ascension: 6,
  constellation: 0,
  talents: { normal: 10, skill: 10, burst: 10 },
  teammates,
  conditions: {},
  pieces: {},
  ...patch,
})
const hit = (r: ReturnType<typeof rotationDamage>, name: string) =>
  r!.hits.find((h) => h.name === name)!
const crit = (key: string, extraRate = 0) => {
  const c = getCharacter(key)!
  const asc = c.ascension[6].stat
  const rate = 0.05 + extraRate + (c.ascensionStat === 'critRate_' ? asc : 0)
  const cd = 0.5 + (c.ascensionStat === 'critDMG_' ? asc : 0)
  return 1 + Math.min(rate, 1) * cd
}
const emSands = (): Artifact => ({
  id: 'em-sands',
  setKey: 'gildeddreams',
  slot: 'sands',
  rarity: 5,
  level: 20,
  mainStat: 'eleMas',
  substats: [],
})

describe('team detection', () => {
  it('finds Quicken, Radiance and Moonsign from elements', () => {
    expect(teamOf(['clorinde', 'collei']).quicken).toBe(true)
    expect(teamOf(['clorinde', 'fischl']).quicken).toBe(false)
    expect(teamOf(['vesna', 'qiqi']).radiance).toBe(true)
    expect(teamOf(['vesna', 'faruzan']).radiance).toBe(false)
    expect(teamOf(['nefer', 'aino']).moonsign).toBe(2)
  })
})

describe('Aggravate', () => {
  it('adds share × 1.15 × level multiplier × (1 + EM bonus) to an Electro hit', () => {
    const off = { 'clorinde-a1': 0, 'clorinde-a4': 0 }
    const withQuicken = hit(
      rotationDamage(input('clorinde', ['collei'], { conditions: off })),
      'Swift Hunt',
    )
    const without = hit(
      rotationDamage(input('clorinde', ['fischl'], { conditions: off })),
      'Swift Hunt',
    )
    expect(withQuicken.reaction).toBe('Aggravate')
    // EM 0, no DMG%: the added part only goes through crit, DEF and RES.
    const added = 0.5 * REACTION_DATA.additive.aggravate * L90 * crit('clorinde') * DEF * RES
    expect(withQuicken.each - without.each).toBeCloseTo(added, 4)
  })

  it('follows the share you set', () => {
    const at = (share: number) =>
      hit(
        rotationDamage(input('clorinde', ['collei'], { conditions: { 'react-aggravate': share } })),
        'Swift Hunt',
      ).each
    expect(at(100) - at(0)).toBeCloseTo(2 * (at(50) - at(0)), 4)
  })
})

describe('Stellar Swirl', () => {
  it('Vesna’s Spirit Blades use the Stellar Swirl formula with a Cryo teammate (no DEF, no DMG%)', () => {
    const r = rotationDamage(input('vesna', ['qiqi']))
    const q = hit(r, 'For the Tsaritsa!')
    expect(q.reaction).toBe('Stellar Swirl')
    const v = getCharacter('vesna')!
    // Truth Prevails: ATK +6% for each Cryo/Anemo member (Vesna and Qiqi).
    const atk = characterBaseStats(v, 90, 6).atk * (1 + 2 * BUFF_DATA.vesna.a4AtkPerCryoAnemo)
    const base = Math.min(
      (atk / 100) * BUFF_DATA.vesna.a0BaseDmgPer100Atk,
      BUFF_DATA.vesna.a0BaseDmgMax,
    )
    const [mult] = talentValues('vesna', 'burst', 'Spirit Blade Stellar Swirl DMG', 10)
    const stacks = 1 + 0.1 * 4
    expect(q.each).toBeCloseTo(mult * atk * stacks * (1 + base) * crit('vesna') * RES, 3)
  })

  it('Stellar Swirls: calibrated count and multiplier (your in-game test)', () => {
    const r = rotationDamage(input('vesna', ['qiqi']))
    const s = hit(r, 'Stellar Swirl (reaction + vortex)')
    expect(s.count).toBe(STELLAR_SWIRLS_BY.vesna)
    const v = getCharacter('vesna')!
    const atk = characterBaseStats(v, 90, 6).atk * 1.12
    const base = Math.min((atk / 100) * 0.007, 0.14)
    expect(s.each).toBeCloseTo(STELLAR_SWIRL_MULT * L90 * (1 + base) * crit('vesna') * RES, 3)
  })

  it('Vesna and Faruzan each carry their own Stellar Swirls; others only without them', () => {
    const team = ['vesna', 'faruzan', 'qiqi']
    const swirls = (k: string, mates: string[]) =>
      rotationDamage(input(k, mates))!.hits.find((h) => h.name.startsWith('Stellar Swirl'))
    expect(swirls('vesna', team.slice(1))!.count).toBe(STELLAR_SWIRLS_BY.vesna)
    expect(swirls('faruzan', ['vesna', 'qiqi'])!.count).toBe(STELLAR_SWIRLS_BY.faruzan)
    // Jean (no calibrated count) swirls only when no calibrated swirler is in the team.
    expect(swirls('jean', ['vesna', 'qiqi'])).toBeUndefined()
    expect(swirls('jean', ['qiqi'])!.count).toBe(6)
  })

  it('Faruzan’s burst buffs her own hits too', () => {
    const on = rotationDamage(input('faruzan', ['vesna', 'qiqi']))!
    const off = rotationDamage(
      input('faruzan', ['vesna', 'qiqi'], { conditions: { 'buff-faruzan': 0 } }),
    )!
    expect(on.total).toBeGreaterThan(off.total)
  })

  it('without a Cryo teammate the blades are plain Anemo DMG', () => {
    const r = rotationDamage(input('vesna', ['faruzan']))
    expect(r!.hits.some((h) => h.reaction === 'Stellar Swirl')).toBe(false)
  })
})

describe('Swirl', () => {
  it('Lynette swirls Electro for Clorinde: 0.6 × level multiplier × RES, no crit', () => {
    const r = rotationDamage(input('lynette', ['clorinde']))
    const s = hit(r, 'Electro Swirl')
    expect(s.count).toBe(4)
    expect(s.each).toBeCloseTo(REACTION_DATA.transformative.swirl * L90 * RES, 4)
  })
})

describe('Lunar-Bloom', () => {
  it('Nefer’s Shades scale on EM with the Lunar formula', () => {
    const r = rotationDamage(input('nefer', ['collei'], { pieces: { sands: emSands() } }))
    const shade = hit(r, 'Phantasm Performance 1-Hit (Shades)')
    expect(shade.reaction).toBe('Lunar-Bloom')
    const em = mainStatValue(5, 'eleMas', 20)
    const [mult] = talentValues('nefer', 'skill', 'Phantasm Performance 1-Hit DMG (Shades)', 10)
    const base = Math.min(em * BUFF_DATA.nefer.a0BaseDmgPerEm, BUFF_DATA.nefer.a0BaseDmgMax)
    const expected = mult * em * (1 + (6 * em) / (em + 2000)) * (1 + base) * crit('nefer') * RES
    expect(shade.each).toBeCloseTo(expected, 3)
  })

  it('with Aino (Ascendant Gleam) Nefer gets her Veils: Phantasm +8% each and EM +100', () => {
    // Veils on vs off with the same team, so only the Veil effects differ.
    const moon = (veils: number) =>
      rotationDamage(
        input('nefer', ['aino'], {
          pieces: { sands: emSands() },
          conditions: { 'nefer-veils': veils },
        }),
      )
    const nefer1 = (veils: number) => hit(moon(veils), 'Phantasm Performance 1-Hit (Nefer)').each
    // 2 Veils: no EM bonus yet (needs 3), so only the ×(1 + 0.08 × 2) multiplier.
    expect(nefer1(2) / nefer1(0)).toBeCloseTo(1 + 2 * BUFF_DATA.nefer.a1PhantasmPerVeil, 6)
    expect(moon(3)!.conditions.find((c) => c.id === 'nefer-veils')!.value).toBe(3)
    expect(
      rotationDamage(input('nefer', ['collei']))!.conditions.some((c) => c.id === 'nefer-veils'),
    ).toBe(false)
  })
})

describe('team buffs (Step 19)', () => {
  const member = (key: string, patch: Partial<PartyMember> = {}): PartyMember => ({
    ...newCharacter(key),
    talents: { normal: 10, skill: 10, burst: 10 },
    ...patch,
  })
  const get = (focal: string, party: PartyMember[], stat: string, sets = {}) => {
    const set = teamBuffModifiers(getCharacter(focal)!, party, sets)
    const conds = new Map(set.conditions.map((c) => [c.id, c]))
    return set.modifiers
      .filter((m) => m.stat === stat)
      .reduce((s, m) => s + amount(m, conds, {}), 0)
  }

  it('Faruzan: Anemo DMG and RES shred at her burst level, C6 CRIT DMG', () => {
    expect(get('vesna', [member('faruzan')], 'anemo_dmg_')).toBeCloseTo(
      talentValues('faruzan', 'burst', 'Anemo DMG Bonus', 10)[0],
    )
    expect(get('vesna', [member('faruzan')], 'anemo_res_shred_')).toBeCloseTo(0.3)
    expect(get('vesna', [member('faruzan')], 'anemo_crit_dmg_')).toBe(0)
    expect(get('vesna', [member('faruzan', { constellation: 6 })], 'anemo_crit_dmg_')).toBeCloseTo(
      0.4,
    )
  })

  it('Viridescent Venerer on an Anemo teammate shreds the elements it can swirl', () => {
    const lynette = member('lynette', { sets: { viridescentvenerer: 4 } })
    expect(get('clorinde', [lynette], 'electro_res_shred_')).toBeCloseTo(0.4)
    expect(get('clorinde', [member('lynette')], 'electro_res_shred_')).toBe(0)
  })

  it('Lynette ATK by element count; Lisa DEF; Candace NA elemental DMG from her HP', () => {
    // Clorinde (Electro) + Lynette (Anemo) = 2 elements → 12%.
    expect(get('clorinde', [member('lynette')], 'atk_')).toBeCloseTo(0.12)
    expect(get('clorinde', [member('lisa')], 'enemy_def_red_')).toBeCloseTo(0.15)
    const hp = { hp: 30000 } as Record<StatKey, number>
    expect(
      get('clorinde', [member('candace', { final: hp as never })], 'normal_elemental_dmg_'),
    ).toBeCloseTo(0.2 + 0.005 * 30)
  })

  it('Moonsign: a non-Moonsign teammate adds Lunar DMG from their stat, capped', () => {
    const collei = member('collei', { final: { eleMas: 10000 } as never })
    expect(get('nefer', [member('aino'), collei], 'lunar_dmg_')).toBeCloseTo(
      REACTION_DATA.moonsign.cap,
    )
    expect(get('nefer', [collei], 'lunar_dmg_')).toBe(0) // only Nascent Gleam
  })
})

describe('Fischl’s Thundering Retribution', () => {
  it('only with an Electro reaction in the team', () => {
    expect(
      rotationDamage(input('fischl', ['collei']))!.hits.some(
        (h) => h.name === 'Thundering Retribution',
      ),
    ).toBe(true)
    expect(
      rotationDamage(input('fischl', ['clorinde']))!.hits.some(
        (h) => h.name === 'Thundering Retribution',
      ),
    ).toBe(false)
  })
})
