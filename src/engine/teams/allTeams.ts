// All teams by DPS (Step 20). Every team of four from the roster is scored by total DPS: each
// member's approved rotation (Steps 18–19) with the other three as their team, so buffs,
// resonance and reactions all count. Two views:
//  - "now": the gear everyone wears today, for every team;
//  - "best": the strongest teams again with gear re-planned from her artifacts (planTeam: no piece
//    used twice, the biggest damage dealer picks first).
// Saved teams from the Teams tab are always included, ranked like the rest.

import { getCharacter, type ArtifactSlot } from '../../data'
import type { Artifact, OwnedCharacter, OwnedWeapon } from '../../db/types'
import type { ConditionState } from '../modifiers'
import { teamBuffModifiers, type PartyMember } from '../modifiers/teamBuffs'
import { rotationDamage } from '../rotations/damage'
import { memberOf, planTeam, weaponOf, type TeamPlan } from './suggest'

export interface AllTeamsInput {
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  artifacts: Artifact[]
  /** Each character's saved toggles (settings `conditions:<key>`). */
  conditionsByKey: Record<string, ConditionState>
  /** Saved teams to always list (character keys, any order). */
  pinned: { name: string; keys: string[] }[]
  /** How many of the top teams (on current gear) get the best-gear pass. */
  deep?: number
}

export interface MemberDps {
  key: string
  dps: number
}

export interface RankedTeam {
  /** Sorted by DPS, highest first. */
  members: MemberDps[]
  dps: number
  /** Name of the saved team it matches, if any. */
  pinned?: string
}

export interface AllTeamsResult {
  now: RankedTeam[]
  best: (RankedTeam & { plan: TeamPlan; nowDps: number })[]
  /** Rank (1-based, in "now") of each saved team. */
  pinnedRanks: { name: string; rank: number | null; team: RankedTeam | null }[]
  checked: number
  ms: number
}

const DEEP = 20
const NOW_KEPT = 50
const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

function combos<T>(list: T[], k: number): T[][] {
  const out: T[][] = []
  const pick = (start: number, acc: T[]) => {
    if (acc.length === k) return void out.push([...acc])
    for (let i = start; i <= list.length - (k - acc.length); i++) pick(i + 1, [...acc, list[i]])
  }
  pick(0, [])
  return out
}

const keyOf = (keys: string[]) => [...keys].sort().join(',')

/** DPS of each member of a party, with given worn pieces and precomputed party members. */
export function partyDps(
  keys: string[],
  input: AllTeamsInput,
  members: Map<string, PartyMember>,
  wornBy: (key: string) => Partial<Record<ArtifactSlot, Artifact>>,
): RankedTeam {
  const out: MemberDps[] = []
  for (const key of keys) {
    const me = input.owned.find((c) => c.key === key)
    const data = getCharacter(key)
    if (!me || !data) continue
    const mates = keys.filter((k) => k !== key)
    const self = members.get(key)
    const extra = teamBuffModifiers(
      data,
      mates.map((k) => members.get(k)).filter((m): m is PartyMember => !!m),
      self?.sets ?? {},
    )
    const r = rotationDamage({
      characterKey: key,
      level: me.level,
      ascension: me.ascension,
      constellation: me.constellation,
      talents: me.talents,
      weapon: weaponOf(me, input.weapons),
      teammates: mates,
      conditions: input.conditionsByKey[key] ?? {},
      pieces: wornBy(key),
      extra,
    })
    out.push({ key, dps: r?.dps ?? 0 })
  }
  out.sort((a, b) => b.dps - a.dps)
  return { members: out, dps: out.reduce((s, m) => s + m.dps, 0) }
}

export function rankAllTeams(input: AllTeamsInput): AllTeamsResult {
  const started = performance.now()
  const byId = new Map(input.artifacts.map((a) => [a.id, a]))
  const worn = (c: OwnedCharacter) =>
    Object.fromEntries(
      SLOTS.map((s) => [s, c.artifactIds[s] ? byId.get(c.artifactIds[s]!) : undefined]).filter(
        ([, a]) => a,
      ),
    ) as Partial<Record<ArtifactSlot, Artifact>>

  // Each character's stats and sets on today's gear, computed once.
  const now = new Map(
    input.owned.map((c) => [c.key, memberOf(c, input.weapons, input.artifacts)] as const),
  )
  const currentPieces = new Map(input.owned.map((c) => [c.key, worn(c)]))

  const keys = input.owned.map((c) => c.key).filter((k) => getCharacter(k))
  const pinnedByKey = new Map(input.pinned.map((p) => [keyOf(p.keys), p.name]))
  const teams = combos(keys, Math.min(4, keys.length))
  // Saved teams with fewer than four (or someone missing) are scored as they are.
  for (const p of input.pinned) {
    const own = p.keys.filter((k) => keys.includes(k))
    if (own.length && own.length < 4) teams.push(own)
  }

  const scored = teams.map((t) => {
    const r = partyDps(t, input, now, (k) => currentPieces.get(k) ?? {})
    const pinned = pinnedByKey.get(keyOf(t))
    return pinned ? { ...r, pinned } : r
  })
  scored.sort((a, b) => b.dps - a.dps)

  // Best gear for the strongest teams (and the saved ones).
  const deep = input.deep ?? DEEP
  const deepSet = [...scored.slice(0, deep), ...scored.slice(deep).filter((t) => t.pinned)]
  const best = deepSet
    .map((t) => {
      const order = t.members.map((m) => m.key)
      const plan = planTeam({
        owned: input.owned,
        weapons: input.weapons,
        artifacts: input.artifacts,
        conditions: {},
        party: order,
      })
      const planned = new Map<string, Partial<Record<ArtifactSlot, Artifact>>>()
      const members = new Map(now)
      for (const m of plan.members) {
        const c = input.owned.find((x) => x.key === m.key)!
        const ids = m.build
          ? (Object.fromEntries(SLOTS.map((s) => [s, m.build!.pieces[s] ?? null])) as Record<
              ArtifactSlot,
              string | null
            >)
          : c.artifactIds
        const geared = { ...c, artifactIds: ids }
        planned.set(m.key, worn(geared))
        members.set(m.key, memberOf(geared, input.weapons, input.artifacts))
      }
      const r = partyDps(order, input, members, (k) => planned.get(k) ?? currentPieces.get(k) ?? {})
      return { ...r, ...(t.pinned ? { pinned: t.pinned } : {}), plan, nowDps: t.dps }
    })
    .sort((a, b) => b.dps - a.dps)

  const pinnedRanks = input.pinned.map((p) => {
    const i = scored.findIndex(
      (t) => keyOf(t.members.map((m) => m.key)) === keyOf(p.keys.filter((k) => keys.includes(k))),
    )
    return { name: p.name, rank: i >= 0 ? i + 1 : null, team: i >= 0 ? scored[i] : null }
  })

  return {
    // Top of the list plus every saved team (the full list is thousands long).
    now: scored.filter((t, i) => i < NOW_KEPT || t.pinned),
    best,
    pinnedRanks,
    checked: teams.length,
    ms: performance.now() - started,
  }
}
