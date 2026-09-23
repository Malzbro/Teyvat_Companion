// Build optimizer (Step 10). Pure function; the UI runs it in a Web Worker (./worker.ts).
//  1. Filter the inventory by the profile's main stats; skip gear locked to other characters.
//  2. Keep the best few pieces per slot (overall, per candidate set, and by ER if needed).
//  3. Try 4pc of each candidate set (+ best off-piece), 2+2 pairs, and the best mix.
//  4. Score with stats, set bonuses, resonance and weapon passive.
//  5. Return the top 3 with % vs current and a one-line reason.

import { getArtifactSet, type ArtifactSlot } from '../../data'
import { STAT_LABELS } from '../../data/stats'
import type { Artifact } from '../../db/types'
import { ARTIFACT_SLOTS } from '../artifact'
import type { ConditionState } from '../modifiers'
import { getProfile, type Profile } from '../profiles'
import { makeEvaluator, type Evaluation } from './evaluator'

export interface OptimizeInput {
  characterKey: string
  level: number
  ascension: number
  weapon?: { key: string; level: number; ascension: number; refinement: number }
  teammates: string[]
  conditions: ConditionState
  /** Every artifact she owns. */
  artifacts: Artifact[]
  /** What the character wears now, by slot. */
  current: Partial<Record<ArtifactSlot, string>>
  /** Artifact ids worn by other characters who are locked. */
  lockedIds: string[]
  /** Override the stored profile (tests). */
  profile?: Profile
}

export interface SuggestedBuild {
  pieces: Partial<Record<ArtifactSlot, string>>
  score: number
  /** % better than the current build (null when she has no current build). */
  gain: number | null
  reason: string
  /** Slots that change compared with now. */
  swaps: ArtifactSlot[]
  meetsER: boolean
  final: Evaluation['final']
}

export interface OptimizeResult {
  current: { score: number; meetsER: boolean; final: Evaluation['final'] }
  builds: SuggestedBuild[]
  /** How many combinations were scored. */
  checked: number
  ms: number
}

const TOP_OVERALL = 6
const TOP_IN_SET = 5
const TOP_PAIR = 4
const TOP_ER = 2

type Pieces = (Artifact | null)[]

export function optimize(input: OptimizeInput): OptimizeResult {
  const started = performance.now()
  const profile = input.profile ?? getProfile(input.characterKey)
  if (!profile) throw new Error('No profile for this character.')
  const ev = makeEvaluator({ ...input, profile })

  const allowed: Record<ArtifactSlot, string[] | null> = {
    flower: null,
    plume: null,
    sands: profile.sands,
    goblet: profile.goblet,
    circlet: profile.circlet,
  }
  const locked = new Set(input.lockedIds)
  const pool = input.artifacts.filter(
    (a) => !locked.has(a.id) && (!allowed[a.slot] || allowed[a.slot]!.includes(a.mainStat)),
  )

  // Rough value of one piece: score of the character with just that piece.
  const rough = new Map(pool.map((a) => [a.id, ev.evaluate([a]).score]))
  const bySlot = Object.fromEntries(
    ARTIFACT_SLOTS.map((s) => [
      s,
      pool.filter((a) => a.slot === s).sort((a, b) => rough.get(b.id)! - rough.get(a.id)!),
    ]),
  ) as Record<ArtifactSlot, Artifact[]>
  const top = (slot: ArtifactSlot, n: number, setKey?: string) =>
    (setKey ? bySlot[slot].filter((a) => a.setKey === setKey) : bySlot[slot]).slice(0, n)
  /** Pieces of a set for a slot, or her best pieces if she has none of that set there. */
  const topOr = (slot: ArtifactSlot, n: number, setKey: string) => {
    const own = top(slot, n, setKey)
    return own.length ? own : top(slot, n)
  }

  // Keep some high-ER pieces around so ER minimums can be met.
  const erPieces = (slot: ArtifactSlot) =>
    profile.minER
      ? [...bySlot[slot]]
          .sort((a, b) => ev.evaluate([b]).final.enerRech_ - ev.evaluate([a]).final.enerRech_)
          .slice(0, TOP_ER)
      : []
  const overall = Object.fromEntries(
    ARTIFACT_SLOTS.map((s) => [s, unique([...top(s, TOP_OVERALL), ...erPieces(s)])]),
  ) as Record<ArtifactSlot, Artifact[]>
  const orEmpty = (list: Artifact[]): Pieces => (list.length ? list : [null])

  // Collect the best distinct builds: those meeting the ER minimum, and (as a fallback) any.
  type Ranked = { pieces: Pieces; score: number }
  const best: Ranked[] = []
  const bestAny: Ranked[] = []
  const seen = new Set<string>()
  let checked = 0

  function keepTop3(list: Ranked[], pieces: Pieces, score: number) {
    if (list.length === 3 && score <= list[2].score) return
    list.push({ pieces: [...pieces], score })
    list.sort((a, b) => b.score - a.score)
    if (list.length > 3) list.pop()
  }

  function consider(pieces: Pieces) {
    const key = pieces.map((p) => p?.id ?? '-').join(',')
    if (seen.has(key)) return
    seen.add(key)
    checked++
    const e = ev.scoreOnly(pieces)
    keepTop3(bestAny, pieces, e.score)
    if (e.erOk) keepTop3(best, pieces, e.score)
  }

  /** Every combination of one choice per slot. */
  function cartesian(choices: Pieces[], at = 0, acc: Pieces = []) {
    if (at === choices.length) return consider([...acc])
    for (const c of choices[at]) {
      acc[at] = c
      cartesian(choices, at + 1, acc)
    }
  }

  // 4pc of each candidate set, with the off-piece in any slot (or all five in the set).
  for (const setKey of profile.sets.fourPiece) {
    // Slots with no piece of this set fall back to her best pieces (never an empty slot).
    const inSet = ARTIFACT_SLOTS.map((s) => {
      const own = top(s, TOP_IN_SET, setKey)
      return own.length ? own : overall[s]
    })
    cartesian(inSet.map(orEmpty))
    for (let off = 0; off < 5; off++)
      cartesian(ARTIFACT_SLOTS.map((s, i) => orEmpty(i === off ? overall[s] : inSet[i])))
  }

  // 2+2 pairs: two slots of each set and one free slot.
  for (const [a, b] of profile.sets.twoPlusTwo)
    for (const layout of twoPlusTwoLayouts())
      cartesian(
        ARTIFACT_SLOTS.map((s, i) =>
          orEmpty(
            layout[i] === 'a'
              ? topOr(s, TOP_PAIR, a)
              : layout[i] === 'b'
                ? topOr(s, TOP_PAIR, b)
                : top(s, TOP_PAIR),
          ),
        ),
      )

  // Best mix regardless of sets (also covers characters without set candidates).
  cartesian(ARTIFACT_SLOTS.map((s) => orEmpty(top(s, 4))))

  const currentPieces = ARTIFACT_SLOTS.map(
    (s) => input.artifacts.find((a) => a.id === input.current[s]) ?? null,
  )
  const current = ev.evaluate(currentPieces)
  const results = best.length ? best : bestAny

  return {
    current: { score: current.score, meetsER: current.erOk, final: current.final },
    builds: results
      .map(({ pieces }) => ev.evaluate(pieces))
      .map((e, i) => ({
        pieces: Object.fromEntries(
          ARTIFACT_SLOTS.map((s, j) => [s, results[i].pieces[j]?.id]).filter(([, id]) => id),
        ),
        score: e.score,
        gain: current.score > 0 ? (e.score / current.score - 1) * 100 : null,
        reason: reasonFor(results[i].pieces, e, current, profile),
        swaps: ARTIFACT_SLOTS.filter(
          (s, j) => (results[i].pieces[j]?.id ?? undefined) !== input.current[s],
        ),
        meetsER: e.erOk,
        final: e.final,
      })),
    checked,
    ms: performance.now() - started,
  }
}

function unique(list: Artifact[]) {
  return [...new Map(list.map((a) => [a.id, a])).values()]
}

/** All ways to place 2 slots of set A, 2 of set B and 1 free slot. */
function twoPlusTwoLayouts(): ('a' | 'b' | '-')[][] {
  const out: ('a' | 'b' | '-')[][] = []
  for (let free = 0; free < 5; free++) {
    const rest = [0, 1, 2, 3, 4].filter((i) => i !== free)
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) {
        const layout = Array<'a' | 'b' | '-'>(5).fill('b')
        layout[free] = '-'
        layout[rest[i]] = 'a'
        layout[rest[j]] = 'a'
        out.push(layout)
      }
  }
  return out
}

/** "4pc Golden Troupe · more HP" */
function reasonFor(pieces: Pieces, e: Evaluation, current: Evaluation, profile: Profile): string {
  const counts: Record<string, number> = {}
  for (const p of pieces) if (p) counts[p.setKey] = (counts[p.setKey] ?? 0) + 1
  const name = (k: string) => getArtifactSet(k)?.name ?? k
  const four = Object.entries(counts).find(([, n]) => n >= 4)
  const twos = Object.entries(counts).filter(([, n]) => n >= 2 && n < 4)
  const sets = four
    ? `4pc ${name(four[0])}`
    : twos.length
      ? twos.map(([k]) => `2pc ${name(k)}`).join(' + ')
      : 'Mixed sets'

  const factors = [
    ['scaling', e.scaling / (current.scaling || 1), `more ${STAT_LABELS[profile.scaling]}`],
    ['dmg', e.dmgBonus / current.dmgBonus, 'more DMG Bonus'],
    ['crit', e.crit / current.crit, 'better crit'],
    ['reaction', e.reaction / current.reaction, 'more EM for the reaction'],
  ] as const
  const bestFactor = [...factors].sort((a, b) => b[1] - a[1])[0]
  const why = current.score > 0 && bestFactor[1] > 1.005 ? bestFactor[2] : 'strongest found'
  return `${sets} · ${why}`
}
