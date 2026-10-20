// A team's potential DPS and the upgrades that get there (Step 22, approved 2026-10-20).
//
// Max = every member at Lv 90, the talents that matter at 10 (the ones their rotation hits use, or
// their team buffs read), their weapon at its max level up to 90, the best artifacts she owns for
// the team (planTeam) with worn pieces levelled, and the farm-list pieces (Step 21) on top.
// Each upgrade is scored alone against the team on its best gear today, and ranked best value
// first: team DPS gained per resin it costs (domains and world bosses, Step 12; artifacts at the
// Step 21 drop odds). Every upgrade counts as at least one domain run (MIN_COST), so cheap ones
// with tiny gains don't jump ahead of big ones: EXP, Mora and artifact EXP still take time.

import { getCharacter, getWeapon, levelCaps, type ArtifactSlot } from '../../data'
import { ARTIFACT_RESIN_PER_DAY, RESIN_PER_DAY, WORLD_LEVEL } from '../../config'
import type { Artifact, Goal, OwnedCharacter, OwnedWeapon, TalentLevels } from '../../db/types'
import { resinEstimate } from '../farming'
import { GOAL_MAX_LEVEL, goalNeeds } from '../materials'
import { ROTATIONS } from '../rotations/table'
import { artifactAdvice, type AdviceInput, type FarmTarget } from './advice'
import { partyDps } from './allTeams'
import { memberOf, planTeam, type TeamPlan } from './suggest'

const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']
const TALENTS = ['normal', 'skill', 'burst'] as const
type Talent = (typeof TALENTS)[number]
export const TALENT_TARGET = 10
/** A ranking weight, not a game number: the least an upgrade counts as costing (one domain run). */
const MIN_COST = 20

/** Team DPS gained per resin, the order "best value first" uses. */
export const valueOf = (u: Pick<Upgrade, 'gain' | 'resin'>) => u.gain / (u.resin + MIN_COST)

/** Talents a teammate's buffs read their level from (src/engine/modifiers/teamBuffs.ts). */
const BUFF_TALENTS: Record<string, Talent[]> = {
  bennett: ['burst'],
  furina: ['burst'],
  xilonen: ['skill'],
  faruzan: ['burst'],
  candace: ['burst'],
}

/** The talents worth raising for a character: used by their rotation or their buffs. */
export function talentsThatMatter(key: string): Talent[] {
  const used = new Set<Talent>([
    ...(ROTATIONS[key]?.hits.map((h) => h.talent) ?? []),
    ...(BUFF_TALENTS[key] ?? []),
  ])
  return TALENTS.filter((t) => used.has(t))
}

export interface PotentialInput extends Omit<AdviceInput, 'plan'> {
  /** Material counts she owns (id → count). */
  counts: Record<number, number>
}

export type UpgradeKind = 'level' | 'talent' | 'weapon' | 'artifactLevel' | 'farm'

export interface Upgrade {
  id: string
  characterKey: string
  kind: UpgradeKind
  /** e.g. "Lv 80 → 90", "Burst 6 → 10". */
  label: string
  /** Team DPS gain as a fraction of the team on its best gear today. */
  gain: number
  /** Resin it costs (0 = she has the materials, or only EXP/Mora/weekly drops are missing). */
  resin: number
  /** What resin doesn't cover (weekly bosses, EXP and Mora). */
  notCounted: string[]
  farm?: FarmTarget
  artifact?: Artifact
}

/** The goal targets the max needs, per member (for the tracker). */
export interface MemberTarget {
  characterKey: string
  targetLevel: number
  targetAscension: number
  targetTalents: TalentLevels
  weapon?: { weaponId: string; targetLevel: number; targetAscension: number }
}

export interface Potential {
  /** Team DPS on today's gear and levels. */
  now: number
  /** With the best artifacts she owns (planTeam), today's levels. */
  bestGear: number
  /** Everything below applied at once. */
  max: number
  upgrades: Upgrade[]
  targets: MemberTarget[]
  plan: TeamPlan
  ms: number
}

const characterAscensionAt = (key: string, level: number) => {
  const caps = getCharacter(key) ? levelCaps(getCharacter(key)!) : []
  const i = caps.findIndex((c) => c >= level)
  return i < 0 ? caps.length - 1 : i
}

/** Highest weapon level a goal can reach (its own cap, at most Lv 90) and that phase. */
function weaponMax(w: OwnedWeapon) {
  const data = getWeapon(w.key)
  if (!data) return null
  const caps = levelCaps(data).filter((c) => c <= GOAL_MAX_LEVEL)
  return { level: caps[caps.length - 1], ascension: caps.length - 1 }
}

export function teamPotential(input: PotentialInput): Potential {
  const started = performance.now()
  const party = input.party.filter((k) => input.owned.some((c) => c.key === k))
  const ownedOf = (k: string) => input.owned.find((c) => c.key === k)!
  const byId = new Map(input.artifacts.map((a) => [a.id, a]))
  const counts = new Map(Object.entries(input.counts).map(([id, n]) => [Number(id), n]))

  const plan = planTeam({
    owned: input.owned,
    weapons: input.weapons,
    artifacts: input.artifacts,
    conditions: {},
    party,
  })
  const planned = new Map<string, Partial<Record<ArtifactSlot, Artifact>>>()
  for (const k of party) {
    const ids = plan.members.find((m) => m.key === k)?.build?.pieces ?? ownedOf(k).artifactIds
    planned.set(
      k,
      Object.fromEntries(
        SLOTS.map((s) => [s, ids[s] ? byId.get(ids[s]!) : undefined]).filter(([, a]) => a),
      ),
    )
  }
  const wornNow = new Map(
    party.map((k) => {
      const ids = ownedOf(k).artifactIds
      return [
        k,
        Object.fromEntries(
          SLOTS.map((s) => [s, ids[s] ? byId.get(ids[s]!) : undefined]).filter(([, a]) => a),
        ) as Partial<Record<ArtifactSlot, Artifact>>,
      ] as const
    }),
  )

  type State = {
    chars: Map<string, OwnedCharacter>
    weapons: OwnedWeapon[]
    gear: Map<string, Partial<Record<ArtifactSlot, Artifact>>>
  }
  const base: State = {
    chars: new Map(party.map((k) => [k, ownedOf(k)])),
    weapons: input.weapons,
    gear: planned,
  }

  const dpsOf = (s: State) => {
    const extraPieces = [...s.gear.values()].flatMap((g) => Object.values(g)) as Artifact[]
    const artifacts = [...input.artifacts, ...extraPieces.filter((a) => !byId.has(a.id))]
    const owned = input.owned.map((c) => s.chars.get(c.key) ?? c)
    const members = new Map(
      party.map((k) => {
        const pieces = s.gear.get(k) ?? {}
        const ids = Object.fromEntries(SLOTS.map((sl) => [sl, pieces[sl]?.id ?? null]))
        const c = { ...s.chars.get(k)!, artifactIds: ids as OwnedCharacter['artifactIds'] }
        return [k, memberOf(c, s.weapons, artifacts)] as const
      }),
    )
    return partyDps(
      party,
      { ...input, owned, weapons: s.weapons, pinned: [] },
      members,
      (k) => s.gear.get(k) ?? {},
    ).dps
  }

  const now = dpsOf({ ...base, gear: wornNow })
  const bestGear = dpsOf(base)
  const gainOf = (dps: number) => (bestGear > 0 ? dps / bestGear - 1 : 0)
  const withChar = (s: State, c: OwnedCharacter): State => ({
    ...s,
    chars: new Map(s.chars).set(c.key, c),
  })
  const withWeapon = (s: State, w: OwnedWeapon): State => ({
    ...s,
    weapons: s.weapons.map((x) => (x.id === w.id ? w : x)),
  })
  const withPiece = (s: State, k: string, piece: Artifact): State => ({
    ...s,
    gear: new Map(s.gear).set(k, { ...s.gear.get(k), [piece.slot]: piece }),
  })

  const costOf = (goal: Goal, c: OwnedCharacter, weapon?: OwnedWeapon) => {
    const est = resinEstimate(goalNeeds(goal, c, weapon), counts, {
      resinPerDay: RESIN_PER_DAY,
      worldLevel: WORLD_LEVEL,
    })
    return { resin: est.resin, notCounted: est.notCounted }
  }

  const upgrades: Upgrade[] = []
  const targets: MemberTarget[] = []
  let max = base

  for (const k of party) {
    const c = ownedOf(k)
    const data = getCharacter(k)
    if (!data) continue
    const goalBase: Goal = {
      id: '',
      characterKey: k,
      targetLevel: c.level,
      targetAscension: c.ascension,
      targetTalents: c.talents,
      createdAt: '',
    }
    const target: MemberTarget = {
      characterKey: k,
      targetLevel: Math.max(c.level, Math.min(GOAL_MAX_LEVEL, data.ascension.at(-1)!.maxLevel)),
      targetAscension: Math.max(c.ascension, characterAscensionAt(k, GOAL_MAX_LEVEL)),
      targetTalents: { ...c.talents },
    }

    if (c.level < target.targetLevel || c.ascension < target.targetAscension) {
      const levelled = { ...c, level: target.targetLevel, ascension: target.targetAscension }
      upgrades.push({
        id: `${k}-level`,
        characterKey: k,
        kind: 'level',
        label: `Lv ${c.level} → ${target.targetLevel}`,
        gain: gainOf(dpsOf(withChar(base, levelled))),
        ...costOf(
          { ...goalBase, targetLevel: target.targetLevel, targetAscension: target.targetAscension },
          c,
        ),
      })
    }

    for (const t of talentsThatMatter(k)) {
      if (c.talents[t] >= TALENT_TARGET) continue
      target.targetTalents[t] = TALENT_TARGET
      const talents = { ...c.talents, [t]: TALENT_TARGET }
      upgrades.push({
        id: `${k}-${t}`,
        characterKey: k,
        kind: 'talent',
        label: `${t === 'normal' ? 'Normal Attack' : t === 'skill' ? 'Skill' : 'Burst'} ${c.talents[t]} → ${TALENT_TARGET}`,
        gain: gainOf(dpsOf(withChar(base, { ...c, talents }))),
        ...costOf({ ...goalBase, targetTalents: talents }, c),
      })
    }

    const w = c.weaponId ? input.weapons.find((x) => x.id === c.weaponId) : undefined
    const wMax = w && weaponMax(w)
    if (w && wMax && (w.level < wMax.level || w.ascension < wMax.ascension)) {
      target.weapon = {
        weaponId: w.id,
        targetLevel: Math.max(w.level, wMax.level),
        targetAscension: Math.max(w.ascension, wMax.ascension),
      }
      const levelled = {
        ...w,
        level: target.weapon.targetLevel,
        ascension: target.weapon.targetAscension,
      }
      upgrades.push({
        id: `${k}-weapon`,
        characterKey: k,
        kind: 'weapon',
        label: `${getWeapon(w.key)?.name ?? 'Weapon'} Lv ${w.level} → ${levelled.level}`,
        gain: gainOf(dpsOf(withWeapon(base, levelled))),
        ...costOf({ ...goalBase, weapon: target.weapon }, c, w),
      })
      max = withWeapon(max, levelled)
    }

    max = withChar(max, {
      ...(max.chars.get(k) ?? c),
      level: target.targetLevel,
      ascension: target.targetAscension,
      talents: target.targetTalents,
    })
    targets.push(target)
  }

  // Artifacts: the Step 21 advice on the planned gear (every suggestion, not only the top few).
  const advice = artifactAdvice({ ...input, party, plan, show: Infinity })
  for (const l of advice.levelUps) {
    const levelled = { ...l.artifact, id: `${l.artifact.id}~max`, level: l.toLevel }
    upgrades.push({
      id: `level-${l.artifact.id}`,
      characterKey: l.characterKey,
      kind: 'artifactLevel',
      label: `Level to +${l.toLevel}`,
      gain: l.min,
      resin: 0,
      notCounted: ['artifact EXP'],
      artifact: l.artifact,
    })
    max = withPiece(max, l.characterKey, levelled)
  }
  for (const f of advice.farm) {
    upgrades.push({
      id: `farm-${f.characterKey}-${f.slot}`,
      characterKey: f.characterKey,
      kind: 'farm',
      label: 'Farm',
      gain: f.gain,
      resin: Math.round(f.days * ARTIFACT_RESIN_PER_DAY),
      notCounted: [],
      farm: f,
    })
  }
  // Farm pieces replace the slot only when they beat what's there after levelling.
  for (const f of advice.farm) {
    const tried = withPiece(max, f.characterKey, f.piece)
    if (dpsOf(tried) > dpsOf(max)) max = tried
  }

  const worth = upgrades.filter((u) => u.gain > 0)
  worth.sort((a, b) => valueOf(b) - valueOf(a))

  return {
    now,
    bestGear,
    max: Math.max(dpsOf(max), bestGear),
    upgrades: worth,
    targets,
    plan,
    ms: performance.now() - started,
  }
}
