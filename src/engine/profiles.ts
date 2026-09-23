// How each character should be built. Approved by her in Step 9.

import { getCharacter } from '../data'
import type { Element, StatKey } from '../data/types'

export type ScalingStat = 'hp' | 'atk' | 'def' | 'eleMas'
export type DamageType = 'normal' | 'charged' | 'skill' | 'burst'

export type Reaction =
  | { kind: 'none' }
  /** Amplifying reaction; `base` is 1.5 (Pyro→Hydro vape, Cryo→Pyro melt) or 2 (Hydro→Pyro vape, Pyro→Cryo melt). */
  | { kind: 'vaporize' | 'melt'; base: 1.5 | 2 }

export interface Profile {
  key: string
  role: 'dps' | 'support'
  scaling: ScalingStat
  damage: { type: DamageType; element: Element }
  sands: StatKey[]
  goblet: StatKey[]
  circlet: StatKey[]
  sets: { fourPiece: string[]; twoPlusTwo: [string, string][] }
  reaction: Reaction
  /** Minimum Energy Recharge as a fraction (1.4 = 140%). */
  minER?: number
  /** Supports only: Healing Bonus counts towards the score. */
  healer?: boolean
  /** True for the placeholder profile made from the element only. */
  generic?: boolean
}

const dmg = (e: Element) => `${e.toLowerCase()}_dmg_` as StatKey
const CRIT: StatKey[] = ['critRate_', 'critDMG_']
const none: Reaction = { kind: 'none' }

export const PROFILES: Record<string, Profile> = {
  yelan: {
    key: 'yelan',
    role: 'dps',
    scaling: 'hp',
    damage: { type: 'burst', element: 'Hydro' },
    sands: ['hp_', 'enerRech_'],
    goblet: ['hydro_dmg_'],
    circlet: CRIT,
    sets: {
      fourPiece: ['emblemofseveredfate'],
      twoPlusTwo: [['heartofdepth', 'tenacityofthemillelith']],
    },
    reaction: none,
    minER: 1.4,
  },
  furina: {
    key: 'furina',
    role: 'dps',
    scaling: 'hp',
    damage: { type: 'skill', element: 'Hydro' },
    sands: ['hp_', 'enerRech_'],
    goblet: ['hydro_dmg_', 'hp_'],
    circlet: CRIT,
    sets: {
      fourPiece: ['goldentroupe'],
      twoPlusTwo: [['heartofdepth', 'tenacityofthemillelith']],
    },
    reaction: none,
    minER: 1.5,
  },
  navia: {
    key: 'navia',
    role: 'dps',
    scaling: 'atk',
    damage: { type: 'skill', element: 'Geo' },
    sands: ['atk_'],
    goblet: ['geo_dmg_'],
    circlet: CRIT,
    sets: { fourPiece: ['nighttimewhispersintheechoingwoods'], twoPlusTwo: [] },
    reaction: none,
    minER: 1.2,
  },
  skirk: {
    key: 'skirk',
    role: 'dps',
    scaling: 'atk',
    damage: { type: 'normal', element: 'Cryo' },
    sands: ['atk_'],
    goblet: ['cryo_dmg_'],
    circlet: CRIT,
    sets: { fourPiece: ['finaleofthedeepgalleries', 'blizzardstrayer'], twoPlusTwo: [] },
    reaction: none,
  },
  yaemiko: {
    key: 'yaemiko',
    role: 'dps',
    scaling: 'atk',
    damage: { type: 'skill', element: 'Electro' },
    sands: ['atk_'],
    goblet: ['electro_dmg_'],
    circlet: CRIT,
    sets: { fourPiece: ['goldentroupe', 'gildeddreams'], twoPlusTwo: [] },
    reaction: none,
    minER: 1.2,
  },
  clorinde: {
    key: 'clorinde',
    role: 'dps',
    scaling: 'atk',
    damage: { type: 'normal', element: 'Electro' },
    sands: ['atk_'],
    goblet: ['electro_dmg_'],
    circlet: CRIT,
    sets: { fourPiece: ['fragmentofharmonicwhimsy'], twoPlusTwo: [] },
    reaction: none,
  },
  xiangling: {
    key: 'xiangling',
    role: 'dps',
    scaling: 'atk',
    damage: { type: 'burst', element: 'Pyro' },
    sands: ['enerRech_', 'atk_', 'eleMas'],
    goblet: ['pyro_dmg_'],
    circlet: CRIT,
    sets: { fourPiece: ['emblemofseveredfate', 'crimsonwitchofflames'], twoPlusTwo: [] },
    reaction: { kind: 'vaporize', base: 1.5 },
    minER: 1.7,
  },
  citlali: {
    key: 'citlali',
    role: 'support',
    scaling: 'eleMas',
    damage: { type: 'skill', element: 'Cryo' },
    sands: ['eleMas', 'enerRech_'],
    goblet: ['eleMas'],
    circlet: ['eleMas'],
    sets: { fourPiece: ['scrolloftheheroofcindercity'], twoPlusTwo: [] },
    reaction: none,
    minER: 1.4,
  },
  xilonen: {
    key: 'xilonen',
    role: 'support',
    scaling: 'def',
    damage: { type: 'skill', element: 'Geo' },
    sands: ['def_', 'enerRech_'],
    goblet: ['def_'],
    circlet: ['def_', 'critRate_'],
    sets: { fourPiece: ['scrolloftheheroofcindercity'], twoPlusTwo: [] },
    reaction: none,
    minER: 1.3,
  },
  bennett: {
    key: 'bennett',
    role: 'support',
    scaling: 'hp',
    damage: { type: 'burst', element: 'Pyro' },
    sands: ['enerRech_', 'hp_'],
    goblet: ['hp_'],
    circlet: ['heal_'],
    healer: true,
    sets: { fourPiece: ['noblesseoblige'], twoPlusTwo: [] },
    reaction: none,
    minER: 2.0,
  },
  qiqi: {
    key: 'qiqi',
    role: 'support',
    scaling: 'atk',
    damage: { type: 'burst', element: 'Cryo' },
    sands: ['atk_'],
    goblet: ['atk_'],
    circlet: ['heal_'],
    healer: true,
    sets: {
      fourPiece: ['oceanhuedclam'],
      twoPlusTwo: [['noblesseoblige', 'tenacityofthemillelith']],
    },
    reaction: none,
    minER: 1.3,
  },
}

/** Placeholder from the element only (ATK, Skill, ATK%/element/crit, no sets): editable later. */
export function genericProfile(key: string): Profile | undefined {
  const c = getCharacter(key)
  if (!c) return undefined
  return {
    key,
    role: 'dps',
    scaling: 'atk',
    damage: { type: 'skill', element: c.element },
    sands: ['atk_'],
    goblet: [dmg(c.element)],
    circlet: CRIT,
    sets: { fourPiece: [], twoPlusTwo: [] },
    reaction: none,
    generic: true,
  }
}

export function getProfile(key: string): Profile | undefined {
  return PROFILES[key] ?? genericProfile(key)
}

/**
 * Amplifying reaction multiplier (approved in Step 9):
 * base × (1 + 2.78·EM/(EM+1400) + reaction bonus). 1 for no reaction.
 */
export function reactionMultiplier(reaction: Reaction, em: number, amplifyBonus = 0): number {
  if (reaction.kind === 'none') return 1
  return reaction.base * (1 + (2.78 * em) / (em + 1400) + amplifyBonus)
}
