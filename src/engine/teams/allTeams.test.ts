import { describe, expect, it } from 'vitest'
import type { ArtifactSlot, StatKey } from '../../data'
import { newCharacter } from '../../db/roster'
import type { Artifact, OwnedCharacter } from '../../db/types'
import { rankAllTeams, type AllTeamsInput } from './allTeams'

let n = 0
const MAIN: Record<ArtifactSlot, StatKey> = {
  flower: 'hp',
  plume: 'atk',
  sands: 'atk_',
  goblet: 'atk_',
  circlet: 'critRate_',
}
const SLOTS = Object.keys(MAIN) as ArtifactSlot[]
const piece = (slot: ArtifactSlot): Artifact => ({
  id: `a${n++}`,
  setKey: 'gladiatorsfinale',
  slot,
  rarity: 5,
  level: 20,
  mainStat: MAIN[slot],
  substats: [{ key: 'critDMG_', value: 0.2 }],
})

const roster = (keys: string[], artifacts: Artifact[] = []): AllTeamsInput => ({
  owned: keys.map((k): OwnedCharacter => ({
    ...newCharacter(k),
    talents: { normal: 6, skill: 6, burst: 6 },
  })),
  weapons: [],
  artifacts,
  conditionsByKey: {},
  pinned: [],
})

const KEYS = ['vesna', 'qiqi', 'faruzan', 'kaeya', 'clorinde', 'collei']

describe('all teams by DPS', () => {
  it('scores every team of four, highest total first, member DPS adding up', () => {
    const r = rankAllTeams(roster(KEYS))
    expect(r.checked).toBe(15) // C(6,4)
    for (let i = 1; i < r.now.length; i++)
      expect(r.now[i - 1].dps).toBeGreaterThanOrEqual(r.now[i].dps)
    for (const t of r.now) {
      expect(t.members).toHaveLength(4)
      expect(t.dps).toBeCloseTo(t.members.reduce((s, m) => s + m.dps, 0))
    }
  })

  it('a Cryo + Anemo team (Stellar Swirl) beats the same carry without Cryo', () => {
    const r = rankAllTeams(roster(KEYS))
    const vesnaIn = (t: (typeof r.now)[number]) =>
      t.members.find((m) => m.key === 'vesna')?.dps ?? 0
    const withCryo = r.now.find(
      (t) => t.members.some((m) => m.key === 'qiqi' || m.key === 'kaeya') && vesnaIn(t),
    )!
    const noCryo = rankAllTeams(roster(['vesna', 'faruzan', 'clorinde', 'collei'])).now[0]
    expect(vesnaIn(withCryo)).toBeGreaterThan(vesnaIn(noCryo))
  })

  it('always lists saved teams, including ones with fewer than four, with their rank', () => {
    const input = {
      ...roster(KEYS),
      pinned: [{ name: 'Vesna', keys: ['vesna', 'qiqi', 'faruzan'] }],
    }
    const r = rankAllTeams(input)
    const saved = r.now.find((t) => t.pinned === 'Vesna')!
    expect(saved.members.map((m) => m.key).sort()).toEqual(['faruzan', 'qiqi', 'vesna'])
    expect(r.pinnedRanks[0].rank).toBe(r.now.indexOf(saved) + 1)
    expect(r.best.some((t) => t.pinned === 'Vesna')).toBe(true)
  })

  it('best gear: re-planned teams never share a piece and are at least as strong', () => {
    const artifacts = Array.from({ length: 4 }, () => SLOTS.map(piece)).flat()
    const r = rankAllTeams({ ...roster(KEYS, artifacts), deep: 5 })
    expect(r.best).toHaveLength(5)
    for (const t of r.best) {
      const ids = t.plan.members.flatMap((m) => Object.values(m.build?.pieces ?? {}))
      expect(new Set(ids).size).toBe(ids.length)
      expect(t.dps).toBeGreaterThan(t.nowDps) // nobody wears anything now
    }
  })

  it('is quick enough for a roster of 19', () => {
    const big = [
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
    const t = performance.now()
    const r = rankAllTeams({ ...roster(big), deep: 3 })
    expect(r.checked).toBe(3876)
    expect(performance.now() - t).toBeLessThan(20000)
  })
})
