import type { Element, TalentKind } from '../../data/types'

/** Which DMG Bonus a hit gets (Swift Hunt counts as Normal Attack DMG, Oz as Skill DMG …). */
export type HitType = 'normal' | 'charged' | 'plunge' | 'skill' | 'burst' | 'other'

export interface Hit {
  /** Talent table the multiplier comes from. */
  talent: TalentKind
  /** Label in that table, e.g. "Swift Hunt DMG". */
  label: string
  /** Times this hit happens per cycle. A "×5" in the label is counted on top of this. */
  count: number
  /** For labels with alternatives ("52.9%/76.7%"), which one (0-based). Default 0. */
  pick?: number
  type: HitType
  /** Physical for plain weapon swings; defaults to the character's element. */
  element?: Element | 'Physical'
  /** Noelle's Sweeping Time: ATK + (burst "ATK Bonus" × DEF) for this hit. */
  noelleBurstAtk?: boolean
  /** Vesna's Rite of Spring's Procession stacks on this hit (Spirit Blades +10% each). */
  vesnaStacks?: number
  /** Shown in the breakdown, e.g. "Impale the Night: Pact". */
  name?: string
  // --- Step 19 ---
  /** Under Radiance: Stellar Swirl, use this label instead, as Stellar Swirl DMG (Vesna, Traveler). */
  stellarLabel?: string
  /** Element whose RES a Stellar Swirl hit checks (Anemo for Vesna's blades, Cryo for the Traveler). */
  stellarResist?: Element
  /** Counts as Lunar-Bloom DMG (Nefer's Shades): EM-scaling reaction formula, no DEF. */
  lunar?: boolean
  /** Phantasm Performance: +8% per Veil of Falsehood (Nefer's passive 1). */
  phantasm?: boolean
  /** Adds `times` × another label's value to the multiplier (Frostglow stacks on the javelin). */
  addMult?: { label: string; stellarLabel?: string; times: number }
}

export interface Rotation {
  key: string
  hits: Hit[]
  /** What was approved and anything left for later, in plain words. */
  note?: string
}
