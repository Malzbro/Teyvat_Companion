// Typed access to the generated game-data snapshot. Regenerate with `npm run build:data`.

import artifactSetsJson from './generated/artifact-sets.json'
import charactersJson from './generated/characters.json'
import curvesJson from './generated/curves.json'
import materialsJson from './generated/materials.json'
import metaJson from './generated/meta.json'
import weaponsJson from './generated/weapons.json'
import type {
  ArtifactSetData,
  CharacterData,
  CurveTable,
  GameDataMeta,
  MaterialData,
  StatKey,
  WeaponData,
  WeaponType,
} from './types'

export type * from './types'

export const characters = charactersJson as CharacterData[]
export const weapons = weaponsJson as WeaponData[]
export const artifactSets = artifactSetsJson as ArtifactSetData[]
export const materials = materialsJson as MaterialData[]
export const meta = metaJson as GameDataMeta
const curves = curvesJson as { characters: CurveTable; weapons: CurveTable }

const byKey = <T extends { key: string }>(list: T[]) => new Map(list.map((x) => [x.key, x]))
const characterMap = byKey(characters)
const weaponMap = byKey(weapons)
const artifactSetMap = byKey(artifactSets)
const materialMap = new Map(materials.map((m) => [m.id, m]))

export const getCharacter = (key: string) => characterMap.get(key)
export const getWeapon = (key: string) => weaponMap.get(key)
export const getArtifactSet = (key: string) => artifactSetMap.get(key)
export const getMaterial = (id: number) => materialMap.get(id)

export const WEAPON_TYPES: WeaponType[] = ['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst']

/** Level cap of each ascension phase of a character or weapon. */
export const levelCaps = (item: CharacterData | WeaponData) => item.ascension.map((p) => p.maxLevel)

/** Every character starts with these, on top of any ascension stat. */
export const CHARACTER_BASE_CRIT = { critRate_: 0.05, critDMG_: 0.5 } as const

/** Highest level with stat data. Ascension/material costs only go up to 90. */
export const MAX_LEVEL = 100

/** Level cap for each ascension phase 0–6. */
export const ASCENSION_CAPS = [20, 40, 50, 60, 70, 80, 90] as const

/** Lowest ascension phase whose cap allows `level`, given each phase's level cap. */
export function phaseForLevel(level: number, caps: readonly number[]): number {
  const i = caps.findIndex((cap) => level <= cap)
  return i === -1 ? caps.length - 1 : i
}

/** Lowest character ascension phase that allows `level` (level 20 → 0, level 21 → 1). */
export const minAscension = (level: number) => phaseForLevel(level, ASCENSION_CAPS)

function phase<T>(list: T[], ascension: number): T {
  return list[Math.max(0, Math.min(ascension, list.length - 1))]
}

export interface CharacterBaseStats {
  hp: number
  atk: number
  def: number
  /** Ascension stat and its value (fraction for % stats), excluding the 5%/50% base crit. */
  ascensionStat: StatKey
  ascensionValue: number
}

/** Character's own base HP/ATK/DEF and ascension stat at a level and ascension phase. */
export function characterBaseStats(
  character: CharacterData,
  level: number,
  ascension: number,
): CharacterBaseStats {
  const curve = curves.characters[level]
  const p = phase(character.ascension, ascension)
  return {
    hp: character.base.hp * curve[character.curve.hp] + p.hp,
    atk: character.base.atk * curve[character.curve.atk] + p.atk,
    def: character.base.def * curve[character.curve.def] + p.def,
    ascensionStat: character.ascensionStat,
    ascensionValue: p.stat,
  }
}

/** Weapon base ATK and substat value at a level and ascension phase. */
export function weaponStats(weapon: WeaponData, level: number, ascension: number) {
  const curve = curves.weapons[level]
  return {
    atk: weapon.base.atk * curve[weapon.curve.atk] + phase(weapon.ascension, ascension).atk,
    substat: weapon.substat,
    substatValue: weapon.curve.substat ? weapon.base.substat * curve[weapon.curve.substat] : 0,
  }
}

/** Weapon passive text for a refinement (1–5), with values filled in. */
export function weaponPassiveText(weapon: WeaponData, refinement: number): string {
  if (!weapon.passive) return ''
  const values = phase(weapon.passive.refinements, refinement - 1) ?? []
  return weapon.passive.template.replace(/\{(\d+)\}/g, (_, i) => values[Number(i)] ?? '')
}

const ICON_CDN = 'https://enka.network/ui/'
/** Second source for icons Enka doesn't have (some newer items). */
const ICON_FALLBACK_CDN = 'https://gi.yatta.moe/assets/UI/'

/** URL for a game icon filename (e.g. "UI_AvatarIcon_Furina"). */
export function iconUrl(filename: string): string {
  return `${ICON_CDN}${filename}.png`
}

/** If an Enka icon fails to load, try the fallback CDN once (set up in main.tsx). */
export function fallbackIconUrl(src: string): string | null {
  return src.startsWith(ICON_CDN) ? src.replace(ICON_CDN, ICON_FALLBACK_CDN) : null
}
