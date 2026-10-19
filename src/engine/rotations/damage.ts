// Rotation damage (Step 18). For each hit:
//   base   = Σ multiplier × stat (from the talent label: "ATK", "Max HP", "DEF", "Elemental Mastery")
//   damage = base × (1 + DMG Bonus) × (1 + min(CR,1)·CD) × DEF multiplier × RES multiplier × amp
// with expected (average) crit, an enemy at ENEMY_LEVEL with ENEMY_BASE_RES, and the same stats,
// set effects, resonance and team buffs the optimizer uses (makeEvaluator).

import { getCharacter, type ArtifactSlot } from '../../data'
import { getTalentTable } from '../../data/talents'
import type { Element, StatKey, TalentKind } from '../../data/types'
import type { Artifact, TalentLevels } from '../../db/types'
import { ARTIFACT_SLOTS } from '../artifact'
import type { ConditionState, DmgBlock, ModifierSet } from '../modifiers'
import { makeEvaluator } from '../optimizer/evaluator'
import {
  ENEMY_BASE_RES,
  getProfile,
  reactionMultiplier,
  resMultiplier,
  type Profile,
} from '../profiles'
import type { StatBlock } from '../stats'
import { shownTalents } from '../talents'
import { CYCLE_SECONDS, ROTATIONS } from './table'
import type { Hit, HitType } from './types'

/** Enemy level for DEF (approved in Step 18). */
export const ENEMY_LEVEL = 100

/** Vesna's Rite of Spring's Procession: Spirit Blades +10% per Disciplinary Action stack. */
const VESNA_STACK_BONUS = 0.1
const A1_ASCENSION = 1

type Term = { param: string; stat: StatKey | null }

const STAT_WORDS: [RegExp, StatKey][] = [
  [/^max hp/i, 'hp'],
  [/^def/i, 'def'],
  [/^elemental mastery/i, 'eleMas'],
  [/^atk/i, 'atk'],
]

/**
 * A label's alternatives, each a sum of terms with a hit count:
 * "{p1:P} ATK+{p2:P} Elemental Mastery" → [{terms: [p1·ATK, p2·EM], times: 1}]
 * "{p4:P}/{p5:P}/{p7:P}×3" → three alternatives, the last hitting 3 times.
 */
export function parseLabel(template: string): { terms: Term[]; times: number }[] {
  return template.split('/').map((alt) => {
    const times = Number(/[×x*]\s*(\d+)\s*$/.exec(alt)?.[1] ?? 1)
    const terms: Term[] = []
    const re = /\{(param\d+):([A-Z0-9]*)\}\s*([A-Za-z ]*)/g
    for (const m of alt.matchAll(re)) {
      const word = m[3].trim()
      const stat = STAT_WORDS.find(([w]) => w.test(word))?.[1]
      // A percentage with no stat word scales on ATK; a plain number is flat damage.
      terms.push({ param: m[1], stat: stat ?? (m[2].includes('P') ? 'atk' : null) })
    }
    return { terms, times }
  })
}

const TYPE_DMG: Record<HitType, keyof DmgBlock> = {
  normal: 'normal_dmg_',
  charged: 'charged_dmg_',
  plunge: 'plunge_dmg_',
  skill: 'skill_dmg_',
  burst: 'burst_dmg_',
}

export interface RotationInput {
  characterKey: string
  level: number
  ascension: number
  constellation: number
  talents: TalentLevels
  weapon?: { key: string; level: number; ascension: number; refinement: number }
  teammates: string[]
  conditions: ConditionState
  /** Worn artifacts by slot. */
  pieces: Partial<Record<ArtifactSlot, Artifact>>
  /** Teammates' buffs (modifiers/teamBuffs). */
  extra?: ModifierSet
}

export interface HitResult {
  name: string
  count: number
  /** Average damage of one hit (all instances of a "×N" label). */
  each: number
  total: number
}

export interface RotationResult {
  key: string
  hits: HitResult[]
  /** Damage per cycle. */
  total: number
  dps: number
  note?: string
}

/** Average damage of one hit, given final stats and damage bonuses. */
export function hitDamage(
  hit: Hit,
  ctx: {
    characterKey: string
    level: number
    ascension: number
    talentLevel: (kind: TalentKind) => number
    final: StatBlock
    dmg: DmgBlock
    profile: Profile
    element: Element
  },
): number {
  const table = getTalentTable(ctx.characterKey, hit.talent)
  const row = table?.labels.find((l) => l.split('|')[0] === hit.label)
  if (!table || !row) throw new Error(`No "${hit.label}" in ${ctx.characterKey}'s ${hit.talent}`)
  const level = ctx.talentLevel(hit.talent)
  const at = (param: string) => {
    const v = table.params[param]
    if (!v) throw new Error(`${ctx.characterKey} ${hit.label}: no ${param}`)
    return v[Math.max(0, Math.min(level - 1, v.length - 1))]
  }

  const stats = { ...ctx.final }
  if (hit.noelleBurstAtk) {
    const burst = getTalentTable(ctx.characterKey, 'burst')!
    const atkRow = burst.labels.find((l) => l.startsWith('ATK Bonus|'))!
    const p = /\{(param\d+)/.exec(atkRow)![1]
    const v = burst.params[p]
    stats.atk += v[Math.min(ctx.talentLevel('burst') - 1, v.length - 1)] * ctx.final.def
  }

  const alts = parseLabel(row.split('|')[1] ?? '')
  const alt = alts[Math.min(hit.pick ?? 0, alts.length - 1)]
  let base = 0
  for (const t of alt.terms) base += at(t.param) * (t.stat ? stats[t.stat] : 1)
  base *= alt.times
  if (hit.vesnaStacks && ctx.ascension >= A1_ASCENSION)
    base *= 1 + VESNA_STACK_BONUS * hit.vesnaStacks

  const element = hit.element ?? ctx.element
  const elementKey = `${element.toLowerCase()}_dmg_` as StatKey
  const dmgBonus = 1 + stats[elementKey] + ctx.dmg.dmg_ + ctx.dmg[TYPE_DMG[hit.type]]
  const crit = 1 + Math.min(Math.max(stats.critRate_, 0), 1) * stats.critDMG_
  const defMult = (ctx.level + 100) / (ctx.level + 100 + (ENEMY_LEVEL + 100))
  // Team shred is for the character's own element (see modifiers/teamBuffs).
  const shred = element === ctx.profile.damage.element ? ctx.dmg.enemy_res_shred_ : 0
  const resMult = resMultiplier(ENEMY_BASE_RES - shred)
  const amp =
    element === ctx.profile.damage.element
      ? reactionMultiplier(ctx.profile.reaction, stats.eleMas, ctx.dmg.amplify_dmg_)
      : 1
  return base * dmgBonus * crit * defMult * resMult * amp
}

/** Damage and DPS of a character's approved rotation, or null if they don't have one. */
export function rotationDamage(input: RotationInput): RotationResult | null {
  const rotation = ROTATIONS[input.characterKey]
  const profile = getProfile(input.characterKey)
  const data = getCharacter(input.characterKey)
  if (!rotation || !profile || !data) return null

  const ev = makeEvaluator({
    characterKey: input.characterKey,
    level: input.level,
    ascension: input.ascension,
    weapon: input.weapon,
    teammates: input.teammates,
    conditions: input.conditions,
    profile,
    extra: input.extra,
  })
  const { final, dmg } = ev.evaluate(ARTIFACT_SLOTS.map((s) => input.pieces[s] ?? null))
  const shown = shownTalents(input.characterKey, input.constellation, input.talents)
  const ctx = {
    characterKey: input.characterKey,
    level: input.level,
    ascension: input.ascension,
    talentLevel: (k: TalentKind) => shown[k],
    final,
    dmg,
    profile,
    element: data.element,
  }

  const hits = rotation.hits.map((hit) => {
    const each = hitDamage(hit, ctx)
    return {
      name: hit.name ?? hit.label.replace(/ DMG$/, ''),
      count: hit.count,
      each,
      total: each * hit.count,
    }
  })
  const total = hits.reduce((s, h) => s + h.total, 0)
  return { key: rotation.key, hits, total, dps: total / CYCLE_SECONDS, note: rotation.note }
}
