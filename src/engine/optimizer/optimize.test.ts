import { describe, expect, it } from 'vitest'
import { getCharacter, getWeapon, type ArtifactSlot, type StatKey } from '../../data'
import type { Artifact, Substat } from '../../db/types'
import { ARTIFACT_SLOTS } from '../artifact'
import { computeBuild } from '../modifiers'
import { getProfile } from '../profiles'
import { makeEvaluator } from './evaluator'
import { optimize, type OptimizeInput } from './optimize'
import { scoreParts } from './score'

let n = 0
const MAIN: Record<ArtifactSlot, StatKey> = {
  flower: 'hp',
  plume: 'atk',
  sands: 'hp_',
  goblet: 'hydro_dmg_',
  circlet: 'critDMG_',
}
const art = (
  slot: ArtifactSlot,
  setKey: string,
  substats: Substat[] = [],
  mainStat: StatKey = MAIN[slot],
): Artifact => ({
  id: `${slot}-${setKey}-${n++}`,
  slot,
  setKey,
  rarity: 5,
  level: 20,
  mainStat,
  substats,
})

const crit = (cr: number, cd: number): Substat[] => [
  { key: 'critRate_', value: cr },
  { key: 'critDMG_', value: cd },
]

const furinaInput = (artifacts: Artifact[], patch: Partial<OptimizeInput> = {}): OptimizeInput => ({
  characterKey: 'furina',
  level: 90,
  ascension: 6,
  weapon: { key: 'splendoroftranquilwaters', level: 90, ascension: 6, refinement: 1 },
  teammates: [],
  conditions: {},
  artifacts,
  current: {},
  lockedIds: [],
  // No ER minimum for these tests unless stated.
  profile: { ...getProfile('furina')!, minER: undefined },
  ...patch,
})

describe('optimizer', () => {
  it('fast evaluator gives the same score as computeBuild', () => {
    const pieces = ARTIFACT_SLOTS.map((s, i) =>
      art(s, i < 4 ? 'goldentroupe' : 'emblemofseveredfate', crit(0.035 * (i + 1), 0.07)),
    )
    const profile = getProfile('furina')!
    const teammates = ['yelan', 'bennett', 'xilonen']
    const ev = makeEvaluator({
      characterKey: 'furina',
      level: 90,
      ascension: 6,
      weapon: { key: 'splendoroftranquilwaters', level: 90, ascension: 6, refinement: 1 },
      teammates,
      conditions: { 'troupe-offfield': 0 },
      profile,
    })
    const fast = ev.evaluate(pieces)
    const full = computeBuild({
      character: getCharacter('furina')!,
      level: 90,
      ascension: 6,
      weapon: {
        data: getWeapon('splendoroftranquilwaters')!,
        level: 90,
        ascension: 6,
        refinement: 1,
      },
      artifacts: pieces,
      teammates: teammates.map((k) => getCharacter(k)!),
      conditions: { 'troupe-offfield': 0 },
    })
    expect(fast.score).toBeCloseTo(scoreParts(profile, full.stats.final, full.dmg).score, 6)
    expect(fast.final.hp).toBeCloseTo(full.stats.final.hp, 6)
    // The search loop's allocation-free path agrees too (incl. Emblem's ER-based bonus).
    expect(ev.scoreOnly(pieces).score).toBeCloseTo(fast.score, 6)
    const emblem = ARTIFACT_SLOTS.map((s) => art(s, 'emblemofseveredfate', crit(0.035, 0.07)))
    expect(ev.scoreOnly(emblem).score).toBeCloseTo(ev.evaluate(emblem).score, 6)
  })

  it('picks an obviously better piece', () => {
    const weak = art('flower', 'goldentroupe', crit(0.027, 0.054))
    const strong = art('flower', 'goldentroupe', crit(0.078, 0.156))
    const rest = ARTIFACT_SLOTS.slice(1).map((s) => art(s, 'goldentroupe', crit(0.039, 0.078)))
    const result = optimize(furinaInput([weak, strong, ...rest], { current: { flower: weak.id } }))
    expect(result.builds[0].pieces.flower).toBe(strong.id)
    expect(result.builds[0].swaps).toContain('flower')
    expect(result.builds[0].gain).toBeGreaterThan(0)
  })

  it('prefers 4pc Golden Troupe over 2+2 when pieces are equal…', () => {
    const subs = crit(0.07, 0.14)
    const gt = ARTIFACT_SLOTS.map((s) => art(s, 'goldentroupe', subs))
    const hod = ARTIFACT_SLOTS.map((s) => art(s, 'heartofdepth', subs))
    const tom = ARTIFACT_SLOTS.map((s) => art(s, 'tenacityofthemillelith', subs))
    const top = optimize(furinaInput([...gt, ...hod, ...tom])).builds[0]
    expect(top.reason).toMatch(/^4pc Golden Troupe/)
  })

  it('…but takes 2+2 when the 4pc pieces are much worse', () => {
    const gt = ARTIFACT_SLOTS.map((s) => art(s, 'goldentroupe'))
    const good = crit(0.21, 0.42)
    const hod = ARTIFACT_SLOTS.map((s) => art(s, 'heartofdepth', good))
    const tom = ARTIFACT_SLOTS.map((s) => art(s, 'tenacityofthemillelith', good))
    const top = optimize(furinaInput([...gt, ...hod, ...tom])).builds[0]
    expect(top.reason).not.toMatch(/4pc Golden Troupe/)
    expect(Object.values(top.pieces).some((id) => id!.includes('goldentroupe'))).toBe(false)
  })

  it('respects Energy Recharge minimums', () => {
    const noEr = ARTIFACT_SLOTS.map((s) => art(s, 'goldentroupe', crit(0.078, 0.156)))
    const erSands = art('sands', 'goldentroupe', [{ key: 'enerRech_', value: 0.194 }], 'enerRech_')
    const profile = {
      ...getProfile('furina')!,
      sands: ['hp_', 'enerRech_'] as StatKey[],
      minER: 1.5,
    }
    const result = optimize(furinaInput([...noEr, erSands], { profile }))
    expect(result.builds[0].meetsER).toBe(true)
    expect(result.builds[0].final.enerRech_).toBeGreaterThanOrEqual(1.5)
    expect(result.builds[0].pieces.sands).toBe(erSands.id)
  })

  it('skips gear locked to other characters', () => {
    const mine = ARTIFACT_SLOTS.map((s) => art(s, 'goldentroupe', crit(0.035, 0.07)))
    const better = art('flower', 'goldentroupe', crit(0.117, 0.234))
    const result = optimize(furinaInput([...mine, better], { lockedIds: [better.id] }))
    expect(Object.values(result.builds[0].pieces)).not.toContain(better.id)
  })

  it('returns up to 3 distinct builds', () => {
    const pieces = ARTIFACT_SLOTS.flatMap((s) =>
      [0.027, 0.035, 0.039].map((cr) => art(s, 'goldentroupe', crit(cr, cr * 2))),
    )
    const { builds } = optimize(furinaInput(pieces))
    expect(builds).toHaveLength(3)
    expect(new Set(builds.map((b) => JSON.stringify(b.pieces))).size).toBe(3)
    expect(builds[0].score).toBeGreaterThanOrEqual(builds[1].score)
  })

  it('benchmark: ~300 artifacts in under 1 second', () => {
    const sets = [
      'goldentroupe',
      'heartofdepth',
      'tenacityofthemillelith',
      'emblemofseveredfate',
      'gladiatorsfinale',
      'noblesseoblige',
    ]
    const subKeys: StatKey[] = ['critRate_', 'critDMG_', 'hp_', 'enerRech_', 'atk_', 'eleMas', 'hp']
    const tiers: Record<string, number> = {
      critRate_: 0.035,
      critDMG_: 0.07,
      hp_: 0.053,
      enerRech_: 0.058,
      atk_: 0.053,
      eleMas: 21,
      hp: 269,
    }
    let seed = 7
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const sandsMains: StatKey[] = ['hp_', 'enerRech_', 'atk_']
    const artifacts: Artifact[] = Array.from({ length: 300 }, (_, i) => {
      const slot = ARTIFACT_SLOTS[i % 5]
      const main = slot === 'sands' ? sandsMains[i % 3] : MAIN[slot]
      const keys = subKeys
        .filter((k) => k !== main)
        .sort(() => rand() - 0.5)
        .slice(0, 4)
      return art(
        slot,
        sets[Math.floor(rand() * sets.length)],
        keys.map((k) => ({ key: k, value: tiers[k] * (1 + Math.floor(rand() * 3)) })),
        main,
      )
    })
    const t = performance.now()
    const result = optimize(furinaInput(artifacts, { profile: getProfile('furina')! }))
    const ms = performance.now() - t
    expect(result.builds.length).toBeGreaterThan(0)
    expect(ms).toBeLessThan(1000)
  })
})
