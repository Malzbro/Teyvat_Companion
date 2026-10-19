import type { CharacterData, StatKey } from '../../data/types'
import type { StatBlock } from '../stats'

/** Bonuses that aren't on the stat screen but change damage. */
export type DmgKey =
  | 'dmg_' // all DMG
  | 'normal_dmg_'
  | 'charged_dmg_'
  | 'plunge_dmg_'
  | 'skill_dmg_'
  | 'burst_dmg_'
  | 'amplify_dmg_' // Vaporize / Melt bonus
  | 'transformative_dmg_' // Overloaded / Burning / Burgeon bonus
  | 'enemy_res_shred_' // Enemy RES to the character's damage element lowered (fraction)

export type ModStat = StatKey | DmgKey

export const DMG_LABELS: Record<DmgKey, string> = {
  dmg_: 'All DMG',
  normal_dmg_: 'Normal Attack DMG',
  charged_dmg_: 'Charged Attack DMG',
  plunge_dmg_: 'Plunging Attack DMG',
  skill_dmg_: 'Elemental Skill DMG',
  burst_dmg_: 'Elemental Burst DMG',
  amplify_dmg_: 'Vaporize/Melt DMG',
  transformative_dmg_: 'Overloaded/Burning/Burgeon DMG',
  enemy_res_shred_: 'Enemy RES decrease',
}

export interface Modifier {
  id: string
  /** Where it comes from, e.g. "Golden Troupe 4pc". */
  source: string
  stat: ModStat
  /** Value per stack for stack conditions (fraction for %). */
  value: number
  /** Only applies while this condition is on (or has stacks). */
  condition?: string
  /** Other conditions that must also be on. */
  requires?: string[]
  /** Value worked out from the final stats instead (e.g. Emblem's Burst DMG from ER). */
  fromStats?: (stats: StatBlock) => number
}

export interface Condition {
  /** Stable id so the UI can toggle it. */
  id: string
  source: string
  label: string
  kind: 'toggle' | 'stacks'
  /** For stacks. */
  max?: number
  /** Toggles: 0 or 1. Stacks: 0…max. */
  default: number
}

/** Effects shown as text only (team buffs, enemy RES shred, non-stat effects). */
export interface Note {
  source: string
  text: string
}

export interface ModifierSet {
  modifiers: Modifier[]
  conditions: Condition[]
  notes: Note[]
}

export interface ModifierContext {
  character: CharacterData
  /** Pieces equipped per artifact set. */
  setCounts: Record<string, number>
  /** Up to 3 teammates (not including the character). */
  teammates: CharacterData[]
}

export const emptyModifierSet = (): ModifierSet => ({ modifiers: [], conditions: [], notes: [] })

export function merge(...sets: ModifierSet[]): ModifierSet {
  return {
    modifiers: sets.flatMap((s) => s.modifiers),
    conditions: sets.flatMap((s) => s.conditions),
    notes: sets.flatMap((s) => s.notes),
  }
}
