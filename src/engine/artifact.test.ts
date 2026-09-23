import { describe, expect, it } from 'vitest'
import type { Artifact } from '../db/types'
import { mainStatValue, rollsForValue, validateArtifact } from './artifact'

const valid: Omit<Artifact, 'id'> = {
  setKey: 'goldentroupe',
  slot: 'circlet',
  rarity: 5,
  level: 20,
  mainStat: 'critRate_',
  substats: [
    { key: 'critDMG_', value: 0.21 }, // 3 rolls
    { key: 'hp_', value: 0.099 }, // 2 rolls
    { key: 'enerRech_', value: 0.058 }, // 1 roll
    { key: 'atk', value: 19 }, // 1 roll
  ],
}

describe('artifact rules', () => {
  it('knows main stat values by level', () => {
    expect(mainStatValue(5, 'hp', 20)).toBe(4780)
    expect(mainStatValue(5, 'atk', 20)).toBe(311)
    expect(mainStatValue(5, 'critRate_', 20)).toBeCloseTo(0.311)
    expect(mainStatValue(5, 'hp', 0)).toBe(717)
  })

  it('knows how many rolls a value takes', () => {
    expect(rollsForValue(5, 'critRate_', 0.039)).toBe(1)
    expect(rollsForValue(5, 'critRate_', 0.078)).toBe(2)
    expect(rollsForValue(5, 'critRate_', 0.042)).toBeNull()
  })

  it('accepts a real artifact', () => {
    expect(validateArtifact(valid)).toEqual([])
  })

  it('blocks a main stat the slot cannot have', () => {
    expect(validateArtifact({ ...valid, slot: 'sands' })[0]).toMatch(
      /sands can't have CRIT Rate as its main stat/,
    )
  })

  it('blocks duplicate substats and a substat equal to the main stat', () => {
    const dupes = validateArtifact({
      ...valid,
      substats: [valid.substats[0], valid.substats[0], valid.substats[2], valid.substats[3]],
    })
    expect(dupes).toContain('Each substat can only appear once.')
    const sameAsMain = validateArtifact({
      ...valid,
      substats: [{ key: 'critRate_', value: 0.039 }, ...valid.substats.slice(1)],
    })
    expect(sameAsMain.join()).toMatch(/main stat, so it can't also be a substat/)
  })

  it('blocks impossible values with a hint', () => {
    const errors = validateArtifact({
      ...valid,
      substats: [{ key: 'critDMG_', value: 0.5 }, ...valid.substats.slice(1)],
    })
    expect(errors[0]).toMatch(
      /CRIT DMG 50.0% isn't possible on a 5★ artifact\. The highest is 46.6%/,
    )
    const between = validateArtifact({
      ...valid,
      substats: [{ key: 'critRate_', value: 0.042 }, ...valid.substats.slice(1)],
    })
    expect(between.join()).toMatch(/Closest: 3.9% or 5.4%/)
  })

  it('blocks more rolls than the level allows', () => {
    // 5★ +0 has at most 4 rolls; 7.8% CRIT DMG alone is 1 roll but 46.6% needs 6.
    const errors = validateArtifact({
      ...valid,
      level: 0,
      substats: [{ key: 'critDMG_', value: 0.466 }, ...valid.substats.slice(1)],
    })
    expect(errors.join()).toMatch(/need more upgrades/)
  })

  it('requires 4 substats once a 5★ reaches +4', () => {
    expect(validateArtifact({ ...valid, substats: valid.substats.slice(0, 3) })).toContain(
      'A +20 5★ artifact has at least 4 substats.',
    )
    // A fresh +0 5★ can have 3.
    expect(
      validateArtifact({
        ...valid,
        level: 0,
        substats: [
          { key: 'critDMG_', value: 0.078 },
          { key: 'hp_', value: 0.058 },
          { key: 'enerRech_', value: 0.065 },
        ],
      }),
    ).toEqual([])
  })

  it('checks rarity and level against the set', () => {
    expect(validateArtifact({ ...valid, rarity: 3 }).join()).toMatch(/doesn't come in 3★/)
    expect(validateArtifact({ ...valid, level: 21 }).join()).toMatch(/goes up to \+20/)
  })
})
