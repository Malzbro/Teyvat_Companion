import { describe, expect, it } from 'vitest'
import { characterBaseStats, getCharacter } from '../../data'
import { talentValues } from '../../data/talents'
import { ENEMY_BASE_RES } from '../profiles'
import { ENEMY_LEVEL, parseLabel, rotationDamage, type RotationInput } from './damage'
import { CYCLE_SECONDS, ROTATIONS } from './table'

const input = (key: string, patch: Partial<RotationInput> = {}): RotationInput => ({
  characterKey: key,
  level: 90,
  ascension: 6,
  constellation: 0,
  talents: { normal: 10, skill: 10, burst: 10 },
  teammates: [],
  conditions: {},
  pieces: {},
  ...patch,
})

describe('label parsing', () => {
  it('adds ATK and EM terms', () => {
    expect(parseLabel('{param1:F1P} ATK+{param2:F1P} Elemental Mastery')).toEqual([
      {
        terms: [
          { param: 'param1', stat: 'atk' },
          { param: 'param2', stat: 'eleMas' },
        ],
        times: 1,
      },
    ])
  })

  it('splits alternatives and reads ×N', () => {
    const alts = parseLabel('{param4:F1P}/{param5:F1P}/{param7:F1P}×3')
    expect(alts.map((a) => a.times)).toEqual([1, 1, 3])
    expect(parseLabel('{param6:F1P} ×4')[0].times).toBe(4)
    expect(parseLabel('{param1:F1P} Max HP')[0].terms[0].stat).toBe('hp')
  })
})

describe('hit damage', () => {
  it('matches a hand calculation (Fischl’s Oz, no gear)', () => {
    const fischl = getCharacter('fischl')!
    const own = characterBaseStats(fischl, 90, 6)
    expect(own.ascensionStat).toBe('atk_') // Fischl ascends ATK%
    const atk = own.atk * (1 + own.ascensionValue)
    const [oz] = talentValues('fischl', 'skill', "Oz's ATK DMG", 10)
    // ATK × multiplier × (1 + 0 DMG%) × (1 + 5% × 50%) × DEF × RES
    const defMult = 190 / (190 + ENEMY_LEVEL + 100)
    const expected = oz * atk * 1.025 * defMult * (1 - ENEMY_BASE_RES)
    const hit = rotationDamage(input('fischl'))!.hits.find((h) => h.name === 'Oz')!
    expect(hit.each).toBeCloseTo(expected, 6)
    expect(hit.total).toBeCloseTo(expected * 20, 4)
  })

  it('counts a ×5 label five times (Clorinde’s Last Lightfall)', () => {
    // Her A4 CRIT Rate stacks off, to check the ×5 alone.
    const r = rotationDamage(input('clorinde', { conditions: { 'clorinde-a4': 0 } }))!
    const q = r.hits.find((h) => h.name === 'Last Lightfall')!
    const [mult] = talentValues('clorinde', 'burst', 'Skill DMG', 10)
    const atk = characterBaseStats(getCharacter('clorinde')!, 90, 6).atk
    const crit = 1 + (0.05 + getCharacter('clorinde')!.ascension[6].stat) * 0.5
    expect(q.each).toBeCloseTo(5 * mult * atk * crit * (190 / 390) * 0.9, 4)
  })

  it('gives Noelle ATK from DEF in her burst', () => {
    const r = rotationDamage(input('noelle'))!
    const n1 = r.hits.find((h) => h.name === '1-Hit')!
    const noBuff = rotationDamage({
      ...input('noelle'),
      talents: { normal: 10, skill: 10, burst: 1 },
    })!
    expect(n1.each).toBeGreaterThan(noBuff.hits.find((h) => h.name === '1-Hit')!.each)
  })

  it('counts Vesna’s Disciplinary Action stacks only after her first ascension', () => {
    // Same level, ascension 0 vs 1: the burst blade (4 stacks) gains +40% on top of whatever the
    // ascension stats change, which the stackless Windborne Sword Lv. 1 shows.
    const at = (ascension: number) => {
      const r = rotationDamage(input('vesna', { level: 20, ascension }))!
      const get = (n: string) => r.hits.find((h) => h.name === n)!.each
      return { blade: get('For the Tsaritsa!'), sword: get('Windborne Sword Lv. 1') }
    }
    const a0 = at(0)
    const a1 = at(1)
    expect(a1.blade / a0.blade / (a1.sword / a0.sword)).toBeCloseTo(1.4, 6)
  })

  it('uses talent levels: higher talents, more damage', () => {
    const low = rotationDamage(input('clorinde', { talents: { normal: 1, skill: 1, burst: 1 } }))!
    expect(rotationDamage(input('clorinde'))!.total).toBeGreaterThan(low.total)
  })
})

describe('approved rotations', () => {
  it('every rotation’s labels exist in the game data', () => {
    for (const key of Object.keys(ROTATIONS)) {
      const r = rotationDamage(input(key))
      expect(r, key).not.toBeNull()
      expect(r!.total, key).toBeGreaterThan(0)
      expect(r!.dps).toBeCloseTo(r!.total / CYCLE_SECONDS)
    }
  })

  it('covers every damage dealer and support on your account', () => {
    for (const key of [
      'clorinde',
      'vesna',
      'fischl',
      'xiangling',
      'kaeya',
      'noelle',
      'nefer',
      'lisa',
      'travelercryo',
      'collei',
      'faruzan',
      'lynette',
      'bennett',
      'jean',
      'candace',
      'dahlia',
      'aino',
      'charlotte',
      'qiqi',
    ])
      expect(ROTATIONS[key], key).toBeDefined()
  })
})
