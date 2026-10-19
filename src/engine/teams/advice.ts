// Artifacts to level and to farm for a team (Step 21, approved 2026-10-19).
//
// Level these: pieces the team wears (or would wear with best gear) below max level. The main
// stat at max level is exact; substats are random, so the gain is a range: from no useful rolls
// to every remaining roll landing on the most useful substat at its highest roll.
//
// Farm these: for each member and slot, a 5★ +20 piece of their set with the best main stat and
// the two substats that matter most (both CRITs; for supports their scaling stat and Energy
// Recharge), each at two average rolls; the gain is the team's DPS with it. "About N days" is how
// long the chance of such a drop takes at ARTIFACT_RESIN_PER_DAY: half the domain drops are the
// set, a fifth the slot, then GO's main-stat odds and the chance both substats appear.

import { getArtifactSet, type ArtifactSlot } from '../../data'
import type { StatKey } from '../../data/types'
import {
  ARTIFACT_RESIN_PER_DAY,
  FIVE_STARS_PER_DOMAIN_RUN,
  RESIN_PER_DOMAIN_RUN,
} from '../../config'
import type { Artifact, OwnedCharacter, OwnedWeapon } from '../../db/types'
import { artifactStats, maxArtifactLevel } from '../artifact'
import type { ConditionState } from '../modifiers'
import { getProfile, isSupportProfile, type Profile } from '../profiles'
import { partyDps } from './allTeams'
import { memberOf, type TeamPlan } from './suggest'

const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']
/** Two artifact sets drop from each domain. */
const SET_CHANCE = 1 / 2
const SLOT_CHANCE = 1 / SLOTS.length
const SUBSTAT_LINES = 4
/** Rolls per target substat line: its first roll plus, on average, one of the four upgrades. */
const TARGET_ROLLS = 2
/** Hide suggestions that add less than this to team DPS. */
const MIN_GAIN = 0.005
const SHOW = 6

export interface AdviceInput {
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  artifacts: Artifact[]
  conditionsByKey: Record<string, ConditionState>
  party: string[]
  /** Best-gear plan for the party (Step 20); without it, today's gear. */
  plan?: TeamPlan
}

export interface LevelUp {
  characterKey: string
  artifact: Artifact
  toLevel: number
  /** Team DPS gain range, as fractions (0.03 = +3%). */
  min: number
  max: number
}

export interface FarmTarget {
  characterKey: string
  slot: ArtifactSlot
  setKey: string
  mainStat: StatKey
  substats: StatKey[]
  domain: string | null
  /** Team DPS gain as a fraction. */
  gain: number
  /** Chance a single 5★ domain drop is this piece. */
  chance: number
  days: number
}

export interface Advice {
  dps: number
  levelUps: LevelUp[]
  farm: FarmTarget[]
}

const SCALING_SUB: Record<Profile['scaling'], StatKey> = {
  hp: 'hp_',
  atk: 'atk_',
  def: 'def_',
  eleMas: 'eleMas',
}

/** The two substats a piece for this character should have. */
export function keySubstats(profile: Profile, mainStat: StatKey): StatKey[] {
  const want: StatKey[] = isSupportProfile(profile)
    ? [SCALING_SUB[profile.scaling], 'enerRech_']
    : ['critRate_', 'critDMG_']
  return want.filter((k) => k !== mainStat)
}

/** Chance that all `required` substats are among the 4 lines (weighted draws, main stat excluded). */
export function substatChance(mainStat: StatKey, required: StatKey[]): number {
  const pool = Object.entries(artifactStats.substatWeights).filter(([k]) => k !== mainStat) as [
    StatKey,
    number,
  ][]
  const draw = (left: [StatKey, number][], picks: number, need: Set<StatKey>): number => {
    if (need.size === 0) return 1
    if (picks === 0 || need.size > picks) return 0
    const total = left.reduce((s, [, w]) => s + w, 0)
    let p = 0
    for (const [k, w] of left) {
      const rest = left.filter(([x]) => x !== k)
      const still = new Set([...need].filter((x) => x !== k))
      p += (w / total) * draw(rest, picks - 1, still)
    }
    return p
  }
  return draw(pool, SUBSTAT_LINES, new Set(required))
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length

export function artifactAdvice(input: AdviceInput): Advice {
  const byId = new Map(input.artifacts.map((a) => [a.id, a]))
  const ownedOf = (k: string) => input.owned.find((c) => c.key === k)!
  const party = input.party.filter((k) => input.owned.some((c) => c.key === k))

  // Gear each member wears in this view.
  const gear = new Map<string, Partial<Record<ArtifactSlot, Artifact>>>()
  for (const k of party) {
    const planned = input.plan?.members.find((m) => m.key === k)?.build?.pieces
    const ids = planned ?? ownedOf(k).artifactIds
    gear.set(
      k,
      Object.fromEntries(
        SLOTS.map((s) => [s, ids[s] ? byId.get(ids[s]!) : undefined]).filter(([, a]) => a),
      ),
    )
  }

  const all = { ...input, pinned: [] }
  /** Team DPS with one member's slot swapped for `piece` (or today's view when omitted). */
  const teamDps = (swap?: { key: string; slot: ArtifactSlot; piece: Artifact }) => {
    const worn = new Map(gear)
    if (swap) worn.set(swap.key, { ...worn.get(swap.key), [swap.slot]: swap.piece })
    const artifacts = swap ? [...input.artifacts, swap.piece] : input.artifacts
    const members = new Map(
      party.map((k) => {
        const pieces = worn.get(k) ?? {}
        const ids = Object.fromEntries(SLOTS.map((s) => [s, pieces[s]?.id ?? null]))
        const c = { ...ownedOf(k), artifactIds: ids as OwnedCharacter['artifactIds'] }
        return [k, memberOf(c, input.weapons, artifacts)] as const
      }),
    )
    return partyDps(party, all, members, (k) => worn.get(k) ?? {}).dps
  }

  const base = teamDps()
  const gainOf = (dps: number) => (base > 0 ? dps / base - 1 : 0)

  // --- Level these ---
  const levelUps: LevelUp[] = []
  for (const k of party)
    for (const slot of SLOTS) {
      const a = gear.get(k)?.[slot]
      if (!a || a.rarity < 4) continue
      const max = maxArtifactLevel(a.rarity)
      if (a.level >= max) continue
      const levelled = { ...a, id: `${a.id}~max`, level: max }
      const min = gainOf(teamDps({ key: k, slot, piece: levelled }))
      // Upgrades happen every 4 levels; with fewer than 4 lines, the first one adds a line instead.
      const upgrades =
        Math.floor(max / 4) - Math.floor(a.level / 4) - (a.substats.length < 4 ? 1 : 0)
      let best = min
      for (const sub of a.substats) {
        const top = Math.max(...(artifactStats.subTiers[a.rarity]?.[sub.key] ?? [0]))
        const rolled = {
          ...levelled,
          substats: a.substats.map((s) =>
            s.key === sub.key ? { ...s, value: s.value + Math.max(upgrades, 0) * top } : s,
          ),
        }
        best = Math.max(best, gainOf(teamDps({ key: k, slot, piece: rolled })))
      }
      if (best >= MIN_GAIN)
        levelUps.push({ characterKey: k, artifact: a, toLevel: max, min, max: best })
    }
  levelUps.sort((x, y) => y.max - x.max)

  // --- Farm these ---
  const runsPerDay = ARTIFACT_RESIN_PER_DAY / RESIN_PER_DOMAIN_RUN
  const farm: FarmTarget[] = []
  for (const k of party) {
    const profile = getProfile(k)
    if (!profile || profile.generic) continue
    const worn = gear.get(k) ?? {}
    const counts: Record<string, number> = {}
    for (const a of Object.values(worn)) if (a) counts[a.setKey] = (counts[a.setKey] ?? 0) + 1
    const setKey =
      profile.sets.fourPiece.find((s) => (counts[s] ?? 0) >= 4) ?? profile.sets.fourPiece[0]
    if (!setKey) continue
    const tiers = artifactStats.subTiers[5] ?? {}
    for (const slot of SLOTS) {
      const mains: StatKey[] =
        slot === 'flower' ? ['hp'] : slot === 'plume' ? ['atk'] : profile[slot]
      let best: FarmTarget | null = null
      for (const mainStat of mains) {
        const substats = keySubstats(profile, mainStat)
        const piece: Artifact = {
          id: `target-${k}-${slot}-${mainStat}`,
          setKey,
          slot,
          rarity: 5,
          level: 20,
          mainStat,
          substats: substats.map((key) => ({ key, value: TARGET_ROLLS * mean(tiers[key] ?? [0]) })),
        }
        const gain = gainOf(teamDps({ key: k, slot, piece }))
        const chance =
          SET_CHANCE *
          SLOT_CHANCE *
          (artifactStats.mainStatOdds[slot]?.[mainStat] ?? 0) *
          substatChance(mainStat, substats)
        if (chance <= 0) continue
        const days = 1 / (chance * FIVE_STARS_PER_DOMAIN_RUN * runsPerDay)
        const target: FarmTarget = {
          characterKey: k,
          slot,
          setKey,
          mainStat,
          substats,
          domain: getArtifactSet(setKey)?.domain ?? null,
          gain,
          chance,
          days,
        }
        if (!best || gain > best.gain) best = target
      }
      if (best && best.gain >= MIN_GAIN) farm.push(best)
    }
  }
  // Best value first: DPS gained per day of farming.
  farm.sort((x, y) => y.gain / y.days - x.gain / x.days)

  return { dps: base, levelUps: levelUps.slice(0, SHOW), farm: farm.slice(0, SHOW) }
}
