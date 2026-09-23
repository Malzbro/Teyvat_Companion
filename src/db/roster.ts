// Roster actions: characters, weapons and equipping. Equipment lives on the character only.

import { ASCENSION_CAPS, getCharacter, getWeapon, phaseForLevel } from '../data'
import { db as defaultDb, newId, type AppDatabase } from '.'
import type { OwnedCharacter, OwnedWeapon } from './types'

export function newCharacter(key: string): OwnedCharacter {
  return {
    key,
    level: 90,
    ascension: 6,
    constellation: 0,
    talents: { normal: 1, skill: 1, burst: 1 },
    weaponId: null,
    artifactIds: { flower: null, plume: null, sands: null, goblet: null, circlet: null },
    locked: false,
    favourite: false,
  }
}

export function newWeapon(key: string): OwnedWeapon {
  const caps = getWeapon(key)?.ascension.map((p) => p.maxLevel) ?? [...ASCENSION_CAPS]
  const maxLevel = caps[caps.length - 1]
  return {
    id: newId(),
    key,
    level: maxLevel,
    ascension: phaseForLevel(maxLevel, caps),
    refinement: 1,
  }
}

export async function saveCharacter(character: OwnedCharacter, db: AppDatabase = defaultDb) {
  if (!getCharacter(character.key)) throw new Error(`Unknown character ${character.key}`)
  await db.characters.put(character)
}

/**
 * Removes a character with its team, goals and saved builds. Its weapon and artifacts stay in
 * the inventory; team comps keep the slot (shown as not in the roster).
 */
export async function removeCharacter(key: string, db: AppDatabase = defaultDb) {
  await db.transaction('rw', [db.characters, db.teams, db.goals, db.builds], async () => {
    await db.characters.delete(key)
    await db.teams.delete(key)
    await db.goals.where('characterKey').equals(key).delete()
    await db.builds.where('characterKey').equals(key).delete()
  })
}

export async function saveWeapon(weapon: OwnedWeapon, db: AppDatabase = defaultDb) {
  if (!getWeapon(weapon.key)) throw new Error(`Unknown weapon ${weapon.key}`)
  await db.weapons.put(weapon)
}

/** Deletes a weapon and unequips it from whoever holds it. */
export async function removeWeapon(id: string, db: AppDatabase = defaultDb) {
  await db.transaction('rw', [db.characters, db.weapons], async () => {
    await db.characters.filter((c) => c.weaponId === id).modify({ weaponId: null })
    await db.weapons.delete(id)
  })
}

/**
 * Equips a weapon (or null to unequip). If another character holds it, they lose it.
 * Throws if the weapon type doesn't match the character.
 */
export async function equipWeapon(
  characterKey: string,
  weaponId: string | null,
  db: AppDatabase = defaultDb,
) {
  await db.transaction('rw', [db.characters, db.weapons], async () => {
    if (weaponId) {
      const weapon = await db.weapons.get(weaponId)
      const weaponType = weapon && getWeapon(weapon.key)?.type
      if (!weaponType) throw new Error('That weapon no longer exists.')
      if (weaponType !== getCharacter(characterKey)?.weaponType)
        throw new Error(`${getCharacter(characterKey)?.name} can't use a ${weaponType}.`)
      await db.characters
        .filter((c) => c.weaponId === weaponId && c.key !== characterKey)
        .modify({ weaponId: null })
    }
    await db.characters.update(characterKey, { weaponId })
  })
}
