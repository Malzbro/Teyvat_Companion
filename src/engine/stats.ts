// Final character stats: base + ascension stat + weapon + artifacts + always-on 2pc bonuses.

import {
  CHARACTER_BASE_CRIT,
  characterBaseStats,
  getArtifactSet,
  getCharacter,
  getWeapon,
  weaponStats,
  type CharacterData,
  type StatKey,
  type WeaponData,
} from '../data'
import type { Artifact, OwnedCharacter, OwnedWeapon } from '../db/types'
import { mainStatValue } from './artifact'
import { TWO_PIECE_STATS } from './setBonus'

export type StatBlock = Record<StatKey, number>

export const emptyStats = (): StatBlock => ({
  hp: 0,
  hp_: 0,
  atk: 0,
  atk_: 0,
  def: 0,
  def_: 0,
  eleMas: 0,
  enerRech_: 0,
  heal_: 0,
  critRate_: 0,
  critDMG_: 0,
  physical_dmg_: 0,
  pyro_dmg_: 0,
  hydro_dmg_: 0,
  electro_dmg_: 0,
  cryo_dmg_: 0,
  anemo_dmg_: 0,
  geo_dmg_: 0,
  dendro_dmg_: 0,
})

export interface StatInput {
  character: CharacterData
  level: number
  ascension: number
  weapon?: { data: WeaponData; level: number; ascension: number }
  artifacts: Artifact[]
  /** Extra bonuses from modifiers (weapon passives, resonance, 4pc…), added like any other bonus. */
  extra?: Partial<StatBlock>
}

export interface StatResult {
  /** White numbers: character base HP/ATK/DEF, with weapon base ATK added to ATK. */
  base: { hp: number; atk: number; def: number }
  /** Every bonus added up (flat, % and others), before combining with base. */
  bonus: StatBlock
  /** What the stat screen shows. HP/ATK/DEF are totals; % stats are fractions (ER includes the base 100%). */
  final: StatBlock
  /** Number of pieces per artifact set. */
  setCounts: Record<string, number>
}

/** Pieces equipped per set. */
export function countSets(artifacts: Artifact[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const a of artifacts) counts[a.setKey] = (counts[a.setKey] ?? 0) + 1
  return counts
}

export function computeStats({
  character,
  level,
  ascension,
  weapon,
  artifacts,
  extra,
}: StatInput): StatResult {
  const own = characterBaseStats(character, level, ascension)
  const bonus = emptyStats()
  const add = (key: StatKey, value: number) => (bonus[key] += value)

  add('critRate_', CHARACTER_BASE_CRIT.critRate_)
  add('critDMG_', CHARACTER_BASE_CRIT.critDMG_)
  add('enerRech_', 1) // Everyone has 100% Energy Recharge.
  add(own.ascensionStat, own.ascensionValue)

  let weaponAtk = 0
  if (weapon) {
    const w = weaponStats(weapon.data, weapon.level, weapon.ascension)
    weaponAtk = w.atk
    if (w.substat) add(w.substat, w.substatValue)
  }

  for (const a of artifacts) {
    add(a.mainStat, mainStatValue(a.rarity, a.mainStat, a.level))
    for (const s of a.substats) add(s.key, s.value)
  }

  const setCounts = countSets(artifacts)
  for (const [setKey, count] of Object.entries(setCounts)) {
    const twoPiece = TWO_PIECE_STATS[setKey]
    if (count >= 2 && twoPiece && getArtifactSet(setKey)) add(twoPiece.key, twoPiece.value)
  }

  for (const [key, value] of Object.entries(extra ?? {})) add(key as StatKey, value)

  const base = { hp: own.hp, atk: own.atk + weaponAtk, def: own.def }
  const final: StatBlock = { ...bonus }
  // % bonuses scale only the white base (character + weapon base ATK); flat is added after.
  final.hp = base.hp * (1 + bonus.hp_) + bonus.hp
  final.atk = base.atk * (1 + bonus.atk_) + bonus.atk
  final.def = base.def * (1 + bonus.def_) + bonus.def
  return { base, bonus, final, setCounts }
}

/** Stats for a roster character with their equipped weapon and artifacts. */
export function statsForOwned(
  owned: OwnedCharacter,
  weapons: OwnedWeapon[],
  artifacts: Artifact[],
): StatResult | null {
  const character = getCharacter(owned.key)
  if (!character) return null
  const ownedWeapon = owned.weaponId ? weapons.find((w) => w.id === owned.weaponId) : undefined
  const weaponData = ownedWeapon && getWeapon(ownedWeapon.key)
  const equipped = Object.values(owned.artifactIds)
    .map((id) => id && artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => !!a)
  return computeStats({
    character,
    level: owned.level,
    ascension: owned.ascension,
    weapon:
      ownedWeapon && weaponData
        ? { data: weaponData, level: ownedWeapon.level, ascension: ownedWeapon.ascension }
        : undefined,
    artifacts: equipped,
  })
}
