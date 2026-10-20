// Player data saved on the device. Game data (names, stats, costs) lives in src/data.

import type { ArtifactSlot, StatKey } from '../data/types'

export interface TalentLevels {
  normal: number
  skill: number
  burst: number
}

export interface OwnedCharacter {
  /** Character key from game data, e.g. "furina". One entry per character. */
  key: string
  level: number
  /** Ascension phase 0–6. */
  ascension: number
  /** Constellation 0–6. */
  constellation: number
  talents: TalentLevels
  /** Id of the equipped OwnedWeapon, or null. */
  weaponId: string | null
  /** Id of the equipped Artifact per slot, or null. */
  artifactIds: Record<ArtifactSlot, string | null>
  /** When true, the optimizer won't give this character's gear to anyone else. */
  locked: boolean
  favourite: boolean
}

export interface OwnedWeapon {
  id: string
  /** Weapon key from game data, e.g. "splendoroftranquilwaters". */
  key: string
  level: number
  ascension: number
  /** Refinement 1–5. */
  refinement: number
}

export interface Substat {
  key: StatKey
  /** Fraction for % stats (0.039 = 3.9%), flat number otherwise. */
  value: number
}

export interface Artifact {
  id: string
  /** Artifact set key from game data, e.g. "goldentroupe". */
  setKey: string
  slot: ArtifactSlot
  rarity: number
  level: number
  mainStat: StatKey
  /** Up to 4 substats. */
  substats: Substat[]
}

export interface MaterialCount {
  /** Material id from game data. */
  id: number
  count: number
}

export interface Goal {
  id: string
  characterKey: string
  targetLevel: number
  targetAscension: number
  targetTalents: TalentLevels
  /** Optional weapon goal: an OwnedWeapon and its target level. */
  weapon?: { weaponId: string; targetLevel: number; targetAscension: number }
  /** ISO date string. */
  createdAt: string
}

export interface Team {
  /** The main character; one team per character. */
  characterKey: string
  /** Up to 3 teammate character keys. */
  teammates: string[]
}

/** A saved loadout: a weapon and five artifacts, e.g. "Main DPS". Pieces can be shared between builds. */
export interface Build {
  id: string
  characterKey: string
  name: string
  weaponId: string | null
  artifactIds: Record<ArtifactSlot, string | null>
  /** ISO date string. */
  createdAt: string
}

/** A named party of up to 4 on the Teams page. The same character can be in many teams. */
export interface TeamComp {
  id: string
  name: string
  /** Up to 4 members; buildId null = whatever they have equipped. */
  members: { characterKey: string; buildId: string | null }[]
  /** Where a suggested team came from (guide name), if it was copied from one. */
  source?: string
  /** ISO date it was added to the tracker ("Optimise & track"), if it is tracked. */
  trackedAt?: string
  /** ISO date string. */
  createdAt: string
}

/** Small key/value app settings (theme, last-used artifact set, …). */
export interface Setting {
  key: string
  value: unknown
}
