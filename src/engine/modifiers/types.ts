import type { CharacterData, Element, StatKey } from '../../data/types'
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
  // --- Step 19: used by rotations (src/engine/rotations) ---
  | `${Lowercase<Element>}_res_shred_` // Enemy RES to one element lowered
  | 'enemy_def_red_' // Enemy DEF lowered (Lisa)
  | 'normal_elemental_dmg_' // Elemental DMG Bonus on Normal Attacks only (Candace)
  | 'anemo_flat_' // Flat DMG added to Anemo hits (Faruzan's Hurricane Guard)
  | 'anemo_crit_dmg_' // CRIT DMG on Anemo DMG (Faruzan C6)
  | 'aggravate_dmg_'
  | 'spread_dmg_'
  | 'swirl_dmg_'
  | 'stellarswirl_dmg_'
  | 'stellarswirl_baseDmg_'
  | 'lunar_dmg_' // All Lunar reaction DMG
  | 'lunarbloom_baseDmg_'

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
  pyro_res_shred_: 'Enemy Pyro RES decrease',
  hydro_res_shred_: 'Enemy Hydro RES decrease',
  electro_res_shred_: 'Enemy Electro RES decrease',
  cryo_res_shred_: 'Enemy Cryo RES decrease',
  anemo_res_shred_: 'Enemy Anemo RES decrease',
  geo_res_shred_: 'Enemy Geo RES decrease',
  dendro_res_shred_: 'Enemy Dendro RES decrease',
  enemy_def_red_: 'Enemy DEF decrease',
  normal_elemental_dmg_: 'Normal Attack Elemental DMG',
  anemo_flat_: 'Anemo hits: flat DMG',
  anemo_crit_dmg_: 'CRIT DMG on Anemo DMG',
  aggravate_dmg_: 'Aggravate DMG',
  spread_dmg_: 'Spread DMG',
  swirl_dmg_: 'Swirl DMG',
  stellarswirl_dmg_: 'Stellar Swirl DMG',
  stellarswirl_baseDmg_: 'Stellar Swirl Base DMG',
  lunar_dmg_: 'Lunar Reaction DMG',
  lunarbloom_baseDmg_: 'Lunar-Bloom Base DMG',
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
