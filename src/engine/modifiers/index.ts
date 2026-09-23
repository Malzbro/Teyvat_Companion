// Puts it together: base stats + set effects + resonance + weapon passive, with toggles.

import type { CharacterData, StatKey, WeaponData } from '../../data/types'
import type { Artifact } from '../../db/types'
import { computeStats, countSets, type StatBlock, type StatResult } from '../stats'
import { activeResonances, resonanceModifiers, type Resonance } from './resonance'
import { setModifiers } from './sets'
import type { Condition, DmgKey, ModStat, Modifier, Note } from './types'
import { merge } from './types'
import { weaponModifiers } from './weapons'

export * from './types'
export { RESONANCES, activeResonances } from './resonance'
export { SET_EFFECTS, setModifiers } from './sets'
export { resonanceModifiers } from './resonance'
export { weaponModifiers } from './weapons'

export const emptyDmg = (): DmgBlock => Object.fromEntries(DMG_KEYS.map((k) => [k, 0])) as DmgBlock

export type DmgBlock = Record<DmgKey, number>

export const DMG_KEYS: DmgKey[] = [
  'dmg_',
  'normal_dmg_',
  'charged_dmg_',
  'plunge_dmg_',
  'skill_dmg_',
  'burst_dmg_',
  'amplify_dmg_',
  'transformative_dmg_',
]
export const isDmgKey = (k: ModStat): k is DmgKey => (DMG_KEYS as string[]).includes(k)

/** Condition id → on/off (0/1) or stack count. Missing ids use the condition's default. */
export type ConditionState = Record<string, number>

export interface BuildInput {
  character: CharacterData
  level: number
  ascension: number
  weapon?: { data: WeaponData; level: number; ascension: number; refinement: number }
  artifacts: Artifact[]
  /** Up to 3 teammates. */
  teammates: CharacterData[]
  conditions?: ConditionState
}

export interface AppliedModifier extends Modifier {
  /** The value actually added (after stacks / from stats). */
  applied: number
}

export interface BuildResult {
  stats: StatResult
  dmg: DmgBlock
  applied: AppliedModifier[]
  conditions: (Condition & { value: number })[]
  notes: Note[]
  resonances: Resonance[]
}

/** How much a modifier adds under the current toggles (0 if its conditions are off). */
export function amount(
  mod: Modifier,
  conditions: Map<string, Condition>,
  state: ConditionState,
): number {
  const level = (id: string) => state[id] ?? conditions.get(id)?.default ?? 0
  if (mod.requires?.some((id) => level(id) <= 0)) return 0
  if (!mod.condition) return mod.value
  const cond = conditions.get(mod.condition)
  const n = level(mod.condition)
  if (n <= 0) return 0
  return cond?.kind === 'stacks' ? mod.value * Math.min(n, cond.max ?? n) : mod.value
}

export function computeBuild(input: BuildInput): BuildResult {
  const setCounts = countSets(input.artifacts)
  const ctx = { character: input.character, setCounts, teammates: input.teammates.slice(0, 3) }
  const all = merge(
    setModifiers(ctx),
    resonanceModifiers(ctx),
    weaponModifiers(input.weapon, input.character),
  )
  const conditions = new Map(all.conditions.map((c) => [c.id, c]))
  const state = input.conditions ?? {}

  // Pass 1: plain values → stat bonuses and damage bonuses.
  const extra: Partial<StatBlock> = {}
  const dmg = emptyDmg()
  const applied: AppliedModifier[] = []
  const later: Modifier[] = []
  for (const mod of all.modifiers) {
    if (mod.fromStats) {
      later.push(mod)
      continue
    }
    const value = amount(mod, conditions, state)
    if (!value) continue
    applied.push({ ...mod, applied: value })
    if (isDmgKey(mod.stat)) dmg[mod.stat] += value
    else extra[mod.stat as StatKey] = (extra[mod.stat as StatKey] ?? 0) + value
  }

  const stats = computeStats({
    character: input.character,
    level: input.level,
    ascension: input.ascension,
    weapon: input.weapon,
    artifacts: input.artifacts,
    extra,
  })

  // Pass 2: effects worked out from final stats (they only add damage bonuses).
  for (const mod of later) {
    if (amount({ ...mod, value: 1 }, conditions, state) <= 0) continue
    const value = mod.fromStats!(stats.final)
    if (!value) continue
    applied.push({ ...mod, applied: value })
    if (isDmgKey(mod.stat)) dmg[mod.stat] += value
  }

  return {
    stats,
    dmg,
    applied,
    conditions: all.conditions.map((c) => ({ ...c, value: state[c.id] ?? c.default })),
    notes: all.notes,
    resonances: activeResonances(ctx),
  }
}
