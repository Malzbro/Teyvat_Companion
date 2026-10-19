import { describe, expect, it } from 'vitest'
import type { ArtifactSlot, StatKey } from '../../data'
import { ARTIFACT_RESIN_PER_DAY, FIVE_STARS_PER_DOMAIN_RUN } from '../../config'
import { newCharacter } from '../../db/roster'
import type { Artifact, OwnedCharacter } from '../../db/types'
import { artifactStats } from '../artifact'
import { getProfile } from '../profiles'
import { artifactAdvice, keySubstats, substatChance, type AdviceInput } from './advice'

const MAIN: Record<ArtifactSlot, StatKey> = {
  flower: 'hp',
  plume: 'atk',
  sands: 'atk_',
  goblet: 'electro_dmg_',
  circlet: 'critRate_',
}
const SLOTS = Object.keys(MAIN) as ArtifactSlot[]

const art = (slot: ArtifactSlot, level = 20, patch: Partial<Artifact> = {}): Artifact => ({
  id: `${slot}-${level}-${Math.random()}`,
  setKey: 'fragmentofharmonicwhimsy',
  slot,
  rarity: 5,
  level,
  mainStat: MAIN[slot],
  substats: [
    { key: 'critDMG_', value: 0.078 },
    { key: 'hp', value: 299 },
    { key: 'def', value: 23 },
    { key: 'def_', value: 0.058 },
  ],
  ...patch,
})

const team = (pieces: Artifact[]): AdviceInput => {
  const clorinde: OwnedCharacter = {
    ...newCharacter('clorinde'),
    talents: { normal: 8, skill: 8, burst: 8 },
    artifactIds: Object.fromEntries(
      pieces.map((a) => [a.slot, a.id]),
    ) as OwnedCharacter['artifactIds'],
  }
  const owned = ['collei', 'fischl', 'lynette'].map((k) => newCharacter(k))
  return {
    owned: [clorinde, ...owned],
    weapons: [],
    artifacts: pieces,
    conditionsByKey: {},
    party: ['clorinde', 'collei', 'fischl', 'lynette'],
  }
}

describe('substat odds', () => {
  it('reads Genshin Optimizer’s odds', () => {
    expect(artifactStats.mainStatOdds.sands.atk_).toBeCloseTo(80 / 300)
    expect(artifactStats.substatWeights.critRate_).toBe(3)
  })

  it('a single required substat: 1 − chance it is never one of the 4 lines', () => {
    // Circlet with CRIT Rate main: CRIT DMG has weight 3 out of the other 9 substats (total 41).
    const p = substatChance('critRate_', ['critDMG_'])
    expect(p).toBeGreaterThan(0.25)
    expect(p).toBeLessThan(0.4)
    expect(substatChance('atk_', ['critRate_', 'critDMG_'])).toBeLessThan(p)
    expect(substatChance('atk_', [])).toBe(1)
  })

  it('key substats: both CRITs for damage dealers, scaling stat + ER for supports', () => {
    expect(keySubstats(getProfile('clorinde')!, 'atk_')).toEqual(['critRate_', 'critDMG_'])
    expect(keySubstats(getProfile('clorinde')!, 'critRate_')).toEqual(['critDMG_'])
    expect(keySubstats(getProfile('faruzan')!, 'enerRech_')).toEqual(['atk_'])
  })
})

describe('artifact advice', () => {
  it('suggests levelling an unlevelled piece, with an exact minimum gain', () => {
    const pieces = SLOTS.map((s) => (s === 'goblet' ? art(s, 0) : art(s)))
    const a = artifactAdvice(team(pieces))
    const goblet = a.levelUps.find((l) => l.artifact.slot === 'goblet')!
    expect(goblet.toLevel).toBe(20)
    expect(goblet.min).toBeGreaterThan(0)
    expect(goblet.max).toBeGreaterThanOrEqual(goblet.min)
  })

  it('skips pieces already at max level', () => {
    const a = artifactAdvice(team(SLOTS.map((s) => art(s))))
    expect(a.levelUps.every((l) => l.artifact.level < l.toLevel)).toBe(true)
    expect(a.levelUps.filter((l) => l.characterKey === 'clorinde')).toHaveLength(0)
  })

  it('farm targets: the character’s set and main stat, days from the odds at your resin', () => {
    const a = artifactAdvice(team(SLOTS.map((s) => art(s, 20, { setKey: 'gladiatorsfinale' }))))
    const t = a.farm.find((f) => f.characterKey === 'clorinde')!
    expect(t.setKey).toBe('fragmentofharmonicwhimsy')
    expect(t.gain).toBeGreaterThan(0)
    expect(t.domain).toBeTruthy()
    const runs = ARTIFACT_RESIN_PER_DAY / 20
    expect(t.days).toBeCloseTo(1 / (t.chance * FIVE_STARS_PER_DOMAIN_RUN * runs), 6)
    // Sorted by gain per day of farming.
    for (let i = 1; i < a.farm.length; i++)
      expect(a.farm[i - 1].gain / a.farm[i - 1].days).toBeGreaterThanOrEqual(
        a.farm[i].gain / a.farm[i].days,
      )
  })
})
