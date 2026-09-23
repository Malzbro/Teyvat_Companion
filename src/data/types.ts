// Shapes of the trimmed game-data snapshot in src/data/generated/.
// Stat keys follow the GOOD format used by Genshin Optimizer so imports map cleanly later.

export type Element = 'Pyro' | 'Hydro' | 'Electro' | 'Cryo' | 'Anemo' | 'Geo' | 'Dendro'

export type WeaponType = 'Sword' | 'Claymore' | 'Polearm' | 'Bow' | 'Catalyst'

export type ArtifactSlot = 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'

export type StatKey =
  | 'hp'
  | 'hp_'
  | 'atk'
  | 'atk_'
  | 'def'
  | 'def_'
  | 'eleMas'
  | 'enerRech_'
  | 'heal_'
  | 'critRate_'
  | 'critDMG_'
  | 'physical_dmg_'
  | 'pyro_dmg_'
  | 'hydro_dmg_'
  | 'electro_dmg_'
  | 'cryo_dmg_'
  | 'anemo_dmg_'
  | 'geo_dmg_'
  | 'dendro_dmg_'

/** One material and how many of it. `id` is the genshin-db material id. */
export interface MaterialCost {
  id: number
  count: number
}

/** Stat bonus granted by one ascension phase. `maxLevel` is the level cap of that phase. */
export interface CharacterAscensionPhase {
  maxLevel: number
  hp: number
  atk: number
  def: number
  /** Value of the character's ascension stat (fraction for % stats, flat for EM). */
  stat: number
}

export interface CharacterData {
  key: string
  id: number
  name: string
  element: Element
  weaponType: WeaponType
  rarity: 4 | 5
  region: string
  version: string
  /** The stat that grows on ascension (e.g. critRate_ for Furina). */
  ascensionStat: StatKey
  base: { hp: number; atk: number; def: number }
  curve: { hp: string; atk: string; def: string }
  ascension: CharacterAscensionPhase[]
  /** Index 0 = cost of ascension 1 (level 20 → 20+). Levels 90+ have no cost data. */
  ascensionCosts: MaterialCost[][]
  /** Index 0 = cost of talent level 1 → 2, up to 9 → 10. Same for all three talents. */
  talentCosts: MaterialCost[][]
  talentNames: { normal: string; skill: string; burst: string }
  icons: { icon: string; side: string; card: string; splash: string }
}

export interface WeaponData {
  key: string
  id: number
  name: string
  type: WeaponType
  rarity: 1 | 2 | 3 | 4 | 5
  version: string
  /** Weapon substat, or null for 1–2★ weapons without one. */
  substat: StatKey | null
  base: { atk: number; substat: number }
  curve: { atk: string; substat: string }
  ascension: { maxLevel: number; atk: number }[]
  ascensionCosts: MaterialCost[][]
  /** Passive text with {0}, {1}… placeholders, and the values per refinement (index 0 = R1). */
  passive: { name: string; template: string; refinements: string[][] } | null
  icons: { icon: string; awakened: string }
}

export interface ArtifactSetData {
  key: string
  id: number
  name: string
  rarities: number[]
  version: string
  twoPiece: string
  fourPiece: string
  /** Artifact domain entrance name, if the set drops from one. */
  domain: string | null
  icons: Record<ArtifactSlot, string>
}

export type Weekday =
  'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface MaterialData {
  id: number
  name: string
  rarity: number
  type: string
  sortRank: number
  sources: string[]
  /** For talent books / weapon ascension materials: the domain and its open days. */
  domain: { name: string; days: Weekday[] } | null
  icon: string
}

/** Artifact rules and values, from Genshin Optimizer (see scripts/build-artifact-data.ts). */
export interface ArtifactStatsData {
  source: string
  rarities: number[]
  maxLevel: Record<number, number>
  /** How many substats an artifact of this rarity can start with. */
  substatCount: Record<number, { low: number; high: number }>
  slotMainStats: Record<ArtifactSlot, StatKey[]>
  substatKeys: StatKey[]
  /** Main stat value by rarity → stat → level (fraction for % stats). */
  mainValues: Record<number, Partial<Record<StatKey, number[]>>>
  /** The four possible single-roll values by rarity → stat (fraction for % stats). */
  subTiers: Record<number, Partial<Record<StatKey, number[]>>>
  /** Every value the game can display (in display units, e.g. "3.9" or "209") → fewest rolls to reach it. */
  subValues: Record<number, Partial<Record<StatKey, Record<string, number>>>>
}

/** Growth multipliers by level (index = level, 1..100) for each curve name. */
export type CurveTable = Record<string, number>[]

export interface GameDataMeta {
  genshinDbVersion: string
  /** Newest game version found in the data (e.g. "7.1"). */
  gameVersion: string
  generatedAt: string
  counts: { characters: number; weapons: number; artifactSets: number; materials: number }
}
