import { describe, expect, it } from 'vitest'
import { newCharacter, newWeapon } from '../../db/roster'
import type { OwnedCharacter } from '../../db/types'
import { teamPotential, talentsThatMatter, TALENT_TARGET, valueOf } from './potential'

describe('talents that matter', () => {
  it('are the ones a rotation hits with or a buff reads', () => {
    expect(talentsThatMatter('clorinde')).toEqual(['normal', 'skill', 'burst'])
    expect(talentsThatMatter('fischl')).toEqual(['skill', 'burst'])
    expect(talentsThatMatter('faruzan')).toEqual(['skill', 'burst'])
  })
})

describe('team potential', () => {
  const weapon = { ...newWeapon('absolution'), level: 70, ascension: 4 }
  const clorinde: OwnedCharacter = {
    ...newCharacter('clorinde'),
    level: 80,
    ascension: 5,
    talents: { normal: 6, skill: 6, burst: 6 },
    weaponId: weapon.id,
  }
  const input = {
    owned: [clorinde, ...['collei', 'fischl', 'lynette'].map((k) => newCharacter(k))],
    weapons: [weapon],
    artifacts: [],
    conditionsByKey: {},
    party: ['clorinde', 'collei', 'fischl', 'lynette'],
    counts: {},
  }
  const p = teamPotential(input)

  it('targets Lv 90, the talents that matter at 10 and the weapon at 90', () => {
    const t = p.targets.find((x) => x.characterKey === 'clorinde')!
    expect(t.targetLevel).toBe(90)
    expect(t.targetAscension).toBe(6)
    expect(t.targetTalents).toEqual({ normal: 10, skill: 10, burst: 10 })
    expect(t.weapon).toEqual({ weaponId: weapon.id, targetLevel: 90, targetAscension: 6 })
    // Fischl's normal attack isn't in her rotation, so it stays.
    const f = p.targets.find((x) => x.characterKey === 'fischl')!
    expect(f.targetTalents).toEqual({ normal: 1, skill: TALENT_TARGET, burst: TALENT_TARGET })
  })

  it('every upgrade adds DPS, and the max is above today', () => {
    expect(p.upgrades.length).toBeGreaterThan(0)
    expect(p.upgrades.every((u) => u.gain > 0)).toBe(true)
    expect(p.max).toBeGreaterThan(p.bestGear)
    expect(p.bestGear).toBeGreaterThanOrEqual(p.now)
    expect(p.upgrades.some((u) => u.id === 'clorinde-level')).toBe(true)
    expect(p.upgrades.some((u) => u.id === 'clorinde-weapon')).toBe(true)
  })

  it('ranks by DPS per resin, best value first', () => {
    for (let i = 1; i < p.upgrades.length; i++)
      expect(valueOf(p.upgrades[i - 1])).toBeGreaterThanOrEqual(valueOf(p.upgrades[i]))
  })
})
