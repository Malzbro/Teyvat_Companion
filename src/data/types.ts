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

export type TalentKind = 'normal' | 'skill' | 'burst'

/**
 * One talent's scaling table from genshin-db. Each label is "Name|{paramN:format}…", e.g.
 * "Skill DMG|{param1:F1P}" or "Skill DMG|{param1:P} ATK+{param2:P} Elemental Mastery"; params
 * hold each param's value per talent level (index 0 = level 1, up to level 15).
 */
export interface TalentTable {
  name: string
  labels: string[]
  params: Record<string, number[]>
}

export type TalentTables = Record<TalentKind, TalentTable>

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
  /** The talent that C3 and C5 raise by 3 levels (null if the constellation doesn't). */
  talentBoosts: { c3: TalentKind | null; c5: TalentKind | null }
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
  /** For EXP books and enhancement ores: how much EXP one gives. */
  exp?: number
}

/** Level-up EXP tables, from paimon.moe (see scripts/build-exp-data.ts). */
export interface ExpData {
  source: string
  /** Total EXP to reach each level from Lv 1; index = level − 1, up to Lv 90. */
  character: number[]
  /** Same, per weapon rarity (3, 4, 5). */
  weapon: Record<number, number[]>
  /** Mora spent per point of EXP. */
  moraPerExp: { character: number; weapon: number }
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
  /** Chance of each main stat per slot (Step 21). */
  mainStatOdds: Record<ArtifactSlot, Partial<Record<StatKey, number>>>
  /** Relative weight of each substat being picked (Step 21). */
  substatWeights: Partial<Record<StatKey, number>>
}

/** Average drops per run, from paimon.moe (see scripts/build-drop-data.ts). */
export interface DropData {
  source: string
  /** Per domain tier I–IV: average count of [2★, 3★, 4★] talent books. */
  talentDomain: number[][]
  /** Per domain tier I–IV: average count of [2★, 3★, 4★, 5★] weapon materials. */
  weaponDomain: number[][]
  /** Per World Level 0–8: average [gem sliver, fragment, chunk, gemstone, boss material]. */
  worldBoss: number[][]
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
