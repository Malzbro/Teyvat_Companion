import { describe, expect, it } from 'vitest'
import {
  characterBaseStats,
  characters,
  getArtifactSet,
  getCharacter,
  getMaterial,
  getWeapon,
  minAscension,
  weaponPassiveText,
  weaponStats,
} from '.'

describe('game data', () => {
  it('loads Furina with correct base stats at 90/90', () => {
    const furina = getCharacter('furina')!
    expect(furina.element).toBe('Hydro')
    expect(furina.weaponType).toBe('Sword')
    expect(furina.rarity).toBe(5)

    // In-game Lv. 90 base stats: 15307 HP, 244 ATK, 696 DEF, +19.2% CRIT Rate.
    const s = characterBaseStats(furina, 90, 6)
    expect(s.hp).toBeCloseTo(15307.39, 1)
    expect(s.atk).toBeCloseTo(243.96, 1)
    expect(s.def).toBeCloseTo(695.54, 1)
    expect(s.ascensionStat).toBe('critRate_')
    expect(s.ascensionValue).toBeCloseTo(0.192)
  })

  it('uses the ascension phase at level boundaries', () => {
    const furina = getCharacter('furina')!
    expect(characterBaseStats(furina, 20, 1).hp).toBeGreaterThan(
      characterBaseStats(furina, 20, 0).hp,
    )
    expect(minAscension(20)).toBe(0)
    expect(minAscension(21)).toBe(1)
    expect(minAscension(90)).toBe(6)
  })

  it('loads weapon stats and passive text', () => {
    const w = getWeapon('splendoroftranquilwaters')!
    const s = weaponStats(w, 90, 6)
    expect(s.atk).toBeCloseTo(541.83, 1)
    expect(s.substat).toBe('critDMG_')
    expect(s.substatValue).toBeCloseTo(0.882, 3)
    expect(weaponPassiveText(w, 1)).toContain('increased by 8%')
  })

  it('has cost, material and artifact data', () => {
    const furina = getCharacter('furina')!
    expect(furina.ascensionCosts).toHaveLength(6)
    expect(furina.talentCosts).toHaveLength(9)
    const book = getMaterial(104342)!
    expect(book.name).toBe('Guide to Justice')
    expect(book.domain?.days).toEqual(['Tuesday', 'Friday', 'Sunday'])
    expect(getArtifactSet('goldentroupe')!.domain).toBe('Denouement of Sin')
  })

  it('every character cost references a known material', () => {
    for (const c of characters)
      for (const cost of [...c.ascensionCosts, ...c.talentCosts].flat())
        expect(getMaterial(cost.id), `${c.name} material ${cost.id}`).toBeDefined()
  })
})
