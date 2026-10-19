import { describe, expect, it } from 'vitest'
import { getCharacter } from '.'
import { getProfile, PROFILES } from '../engine/profiles'
import { computeStats } from '../engine/stats'
import { getTalentTable, talentValues } from './talents'

describe('talent tables', () => {
  it('reads multipliers at a talent level (Bennett burst ATK ratio at 10 = 100.8%)', () => {
    expect(talentValues('bennett', 'burst', 'ATK Bonus Ratio', 10)).toEqual([1.008])
  })

  it('has a table for every character, Traveler elements included', () => {
    for (const key of ['clorinde', 'vesna', 'nefer', 'travelercryo'])
      for (const kind of ['normal', 'skill', 'burst'] as const)
        expect(Object.keys(getTalentTable(key, kind)!.params).length).toBeGreaterThan(0)
  })

  it('fails loudly on an unknown label', () => {
    expect(() => talentValues('bennett', 'burst', 'Nope', 1)).toThrow(/No "Nope"/)
  })
})

describe('Traveler', () => {
  it('exists per element with Aether’s stats and the element’s own kit', () => {
    const t = getCharacter('travelercryo')!
    expect(t.name).toBe('Traveler (Cryo)')
    expect(t.element).toBe('Cryo')
    expect(t.weaponType).toBe('Sword')
    expect(t.talentNames.burst).toBe('Frostbound Javelin')
    expect(t.talentBoosts).toEqual({ c3: 'burst', c5: 'skill' })
    expect(getCharacter('traveleranemo')!.element).toBe('Anemo')
  })

  it('can be built like anyone else', () => {
    const s = computeStats({
      character: getCharacter('travelercryo')!,
      level: 90,
      ascension: 6,
      artifacts: [],
    })
    expect(s.final.atk).toBeGreaterThan(0)
    expect(s.final.atk_).toBeGreaterThan(0) // ascension stat ATK%
  })
})

// Your roster from the backup of 2026-10-19 (keys only), plus your Cryo Traveler.
const MY_ROSTER = [
  'aino',
  'bennett',
  'candace',
  'charlotte',
  'clorinde',
  'collei',
  'dahlia',
  'faruzan',
  'fischl',
  'jean',
  'kaeya',
  'lisa',
  'lynette',
  'nefer',
  'noelle',
  'qiqi',
  'vesna',
  'xiangling',
  'travelercryo',
]

describe('profiles for your account (Step 17)', () => {
  it('every character in your backup, and your Traveler, has an approved profile', () => {
    expect(MY_ROSTER.filter((k) => !PROFILES[k])).toEqual([])
    for (const k of MY_ROSTER) expect(getProfile(k)!.generic).toBeFalsy()
  })
})
