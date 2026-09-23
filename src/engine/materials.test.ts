import { describe, expect, it } from 'vitest'
import { getCharacter, getMaterial } from '../data'
import type { Goal } from '../db/types'
import {
  MORA_ID,
  characterExpItems,
  exp,
  expOwned,
  goalNeeds,
  progress,
  sumNeeds,
} from './materials'

const goal = (patch: Partial<Goal> = {}): Goal => ({
  id: 'g',
  characterKey: 'furina',
  targetLevel: 90,
  targetAscension: 6,
  targetTalents: { normal: 1, skill: 1, burst: 1 },
  createdAt: '2026-09-23',
  ...patch,
})

const talents = { normal: 1, skill: 1, burst: 1 }

describe('material needs', () => {
  it('Level 80 → 90 needs the last ascension plus EXP and Mora', () => {
    const needs = goalNeeds(goal(), { level: 80, ascension: 5, talents })
    const furina = getCharacter('furina')!

    // EXP from the paimon.moe table: 8,362,650 − 4,939,525.
    expect(needs.characterExp).toBe(3_423_125)
    expect(exp.character[89] - exp.character[79]).toBe(3_423_125)

    // Ascension 6 materials, exactly as in the game data.
    for (const { id, count } of furina.ascensionCosts[5]) {
      const expected = id === MORA_ID ? count + Math.ceil(3_423_125 / 5) : count
      expect(needs.materials.get(id), getMaterial(id)!.name).toBe(expected)
    }
    expect(needs.materials.get(MORA_ID)).toBe(120_000 + 684_625)
    expect(needs.materials.get(104124)).toBe(6) // Varunada Lazurite Gemstone
  })

  it('80/80 already ascended to A6 needs only EXP', () => {
    const needs = goalNeeds(goal(), { level: 80, ascension: 6, talents })
    expect(needs.materials.get(104124)).toBeUndefined()
    expect(needs.characterExp).toBe(3_423_125)
  })

  it('talents 1 → 10 sum all nine level costs, per talent', () => {
    const needs = goalNeeds(goal({ targetTalents: { normal: 1, skill: 10, burst: 10 } }), {
      level: 90,
      ascension: 6,
      talents,
    })
    const furina = getCharacter('furina')!
    const once = new Map<number, number>()
    for (const costs of furina.talentCosts)
      for (const { id, count } of costs) once.set(id, (once.get(id) ?? 0) + count)
    for (const [id, count] of once) expect(needs.materials.get(id)).toBe(count * 2)
    expect(needs.materials.get(104319)).toBe(2) // Crown of Insight, one per talent at Lv 10
    expect(needs.characterExp).toBe(0)
  })

  it('a goal already met needs nothing', () => {
    const needs = goalNeeds(goal(), { level: 90, ascension: 6, talents })
    expect(needs.materials.size).toBe(0)
    expect(progress(needs, new Map())).toBe(1)
  })

  it('weapon goals add weapon ascension, ore EXP and Mora', () => {
    const needs = goalNeeds(
      goal({ weapon: { weaponId: 'w', targetLevel: 90, targetAscension: 6 } }),
      { level: 90, ascension: 6, talents },
      { id: 'w', key: 'splendoroftranquilwaters', level: 80, ascension: 6, refinement: 1 },
    )
    expect(needs.weaponExp).toBe(exp.weapon[5][89] - exp.weapon[5][79])
    expect(needs.materials.get(MORA_ID)).toBe(Math.ceil(needs.weaponExp / 10))
  })

  it('counts EXP books by value and sums goals', () => {
    const counts = new Map([
      [104003, 10], // Hero's Wit
      [104002, 4], // Adventurer's Experience
    ])
    expect(expOwned(characterExpItems, counts)).toBe(220_000)
    const a = goalNeeds(goal(), { level: 80, ascension: 5, talents })
    const total = sumNeeds([a, a])
    expect(total.characterExp).toBe(2 * 3_423_125)
    expect(total.materials.get(104124)).toBe(12)
  })
})
