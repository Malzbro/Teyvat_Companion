// Material needs for goals: ascension, talents, level-up EXP and Mora.

import { getCharacter, getWeapon, materials } from '../data'
import expJson from '../data/generated/exp.json'
import type { ExpData, MaterialCost, MaterialData } from '../data/types'
import type { Goal, OwnedCharacter, OwnedWeapon, TalentLevels } from '../db/types'

export const exp = expJson as unknown as ExpData

export const MORA_ID = 202
/** Goals and EXP data stop at Lv 90 (no cost data beyond). */
export const GOAL_MAX_LEVEL = 90

export const characterExpItems = materials
  .filter((m) => m.exp && m.type === 'Character EXP Material')
  .sort((a, b) => b.exp! - a.exp!)
export const weaponExpItems = materials
  .filter((m) => m.exp && m.type === 'Weapon Enhancement Material')
  .sort((a, b) => b.exp! - a.exp!)

export interface Needs {
  /** Material id → count (Mora included, EXP items not). */
  materials: Map<number, number>
  characterExp: number
  weaponExp: number
}

const emptyNeeds = (): Needs => ({ materials: new Map(), characterExp: 0, weaponExp: 0 })

function add(needs: Needs, costs: MaterialCost[]) {
  for (const { id, count } of costs) needs.materials.set(id, (needs.materials.get(id) ?? 0) + count)
}

/** EXP to go from one level to another (0 if already there). */
function expBetween(table: number[], from: number, to: number) {
  const cap = (l: number) => Math.min(Math.max(l, 1), table.length)
  return Math.max(0, table[cap(to) - 1] - table[cap(from) - 1])
}

export interface CurrentState {
  level: number
  ascension: number
  talents: TalentLevels
}

/** What one goal still needs, given the character's (and weapon's) current state. */
export function goalNeeds(goal: Goal, current: CurrentState, weapon?: OwnedWeapon): Needs {
  const needs = emptyNeeds()
  const character = getCharacter(goal.characterKey)
  if (!character) return needs

  for (let phase = current.ascension + 1; phase <= goal.targetAscension; phase++)
    add(needs, character.ascensionCosts[phase - 1] ?? [])

  needs.characterExp = expBetween(exp.character, current.level, goal.targetLevel)

  for (const talent of ['normal', 'skill', 'burst'] as const)
    for (let lvl = current.talents[talent] + 1; lvl <= goal.targetTalents[talent]; lvl++)
      add(needs, character.talentCosts[lvl - 2] ?? [])

  const weaponData = weapon && getWeapon(weapon.key)
  if (goal.weapon && weapon && weaponData) {
    for (let phase = weapon.ascension + 1; phase <= goal.weapon.targetAscension; phase++)
      add(needs, weaponData.ascensionCosts[phase - 1] ?? [])
    const table = exp.weapon[weaponData.rarity]
    if (table) needs.weaponExp = expBetween(table, weapon.level, goal.weapon.targetLevel)
  }

  const levelMora =
    needs.characterExp * exp.moraPerExp.character + needs.weaponExp * exp.moraPerExp.weapon
  if (levelMora > 0) add(needs, [{ id: MORA_ID, count: Math.ceil(levelMora) }])
  return needs
}

/** Adds several goals' needs together. */
export function sumNeeds(list: Needs[]): Needs {
  const total = emptyNeeds()
  for (const n of list) {
    add(
      total,
      [...n.materials].map(([id, count]) => ({ id, count })),
    )
    total.characterExp += n.characterExp
    total.weaponExp += n.weaponExp
  }
  return total
}

/** Total EXP she holds as books or ores. */
export function expOwned(items: MaterialData[], counts: Map<number, number>) {
  return items.reduce((sum, m) => sum + (counts.get(m.id) ?? 0) * m.exp!, 0)
}

/** Needs of a goal for its character as stored in the roster. */
export function needsFor(goal: Goal, owned: OwnedCharacter | undefined, weapons: OwnedWeapon[]) {
  if (!owned) return emptyNeeds()
  const weapon = goal.weapon && weapons.find((w) => w.id === goal.weapon!.weaponId)
  return goalNeeds(goal, owned, weapon)
}

/** How much of a goal's needs are covered, 0–1, counting EXP by value and each material by count. */
export function progress(needs: Needs, counts: Map<number, number>): number {
  let need = 0
  let have = 0
  for (const [id, count] of needs.materials) {
    need += 1
    have += Math.min(1, (counts.get(id) ?? 0) / count)
  }
  if (needs.characterExp) {
    need += 1
    have += Math.min(1, expOwned(characterExpItems, counts) / needs.characterExp)
  }
  if (needs.weaponExp) {
    need += 1
    have += Math.min(1, expOwned(weaponExpItems, counts) / needs.weaponExp)
  }
  return need ? have / need : 1
}

export const MATERIAL_GROUPS: { label: string; types: string[] }[] = [
  { label: 'Mora & EXP', types: ['Common Currency'] },
  { label: 'Talent books', types: ['Character Talent Material'] },
  { label: 'Ascension gems', types: ['Character Ascension Material'] },
  { label: 'Boss drops', types: ['Character Level-Up Material'] },
  { label: 'Local specialties', types: [] }, // matched by prefix below
  { label: 'Common drops', types: ['Character and Weapon Enhancement Material'] },
  { label: 'Weapon ascension', types: ['Weapon Ascension Material'] },
]

export function groupOf(m: MaterialData): string {
  if (m.type.startsWith('Local Specialty')) return 'Local specialties'
  return MATERIAL_GROUPS.find((g) => g.types.includes(m.type))?.label ?? 'Other'
}
