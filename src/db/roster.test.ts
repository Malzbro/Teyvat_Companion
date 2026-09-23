import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '.'
import {
  equipWeapon,
  newCharacter,
  newWeapon,
  removeCharacter,
  removeWeapon,
  saveCharacter,
  saveWeapon,
} from './roster'

let db: AppDatabase

beforeEach(async () => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`)
  await saveCharacter(newCharacter('furina'), db) // Sword
  await saveCharacter(newCharacter('clorinde'), db) // Sword
  await saveCharacter(newCharacter('yelan'), db) // Bow
})

afterEach(async () => {
  await db.delete()
})

describe('roster', () => {
  it('defaults a new character to Lv 90, C0, talents 1/1/1', () => {
    const c = newCharacter('yelan')
    expect(c).toMatchObject({ level: 90, ascension: 6, constellation: 0 })
    expect(c.talents).toEqual({ normal: 1, skill: 1, burst: 1 })
  })

  it('defaults a new weapon to its max level', () => {
    expect(newWeapon('splendoroftranquilwaters')).toMatchObject({
      level: 90,
      ascension: 6,
      refinement: 1,
    })
    expect(newWeapon('dullblade')).toMatchObject({ level: 70, ascension: 4 })
  })

  it('equipping moves a weapon from one character to another', async () => {
    const sword = newWeapon('splendoroftranquilwaters')
    await saveWeapon(sword, db)
    await equipWeapon('furina', sword.id, db)
    await equipWeapon('clorinde', sword.id, db)
    expect((await db.characters.get('furina'))!.weaponId).toBeNull()
    expect((await db.characters.get('clorinde'))!.weaponId).toBe(sword.id)
  })

  it('refuses a weapon of the wrong type', async () => {
    const sword = newWeapon('splendoroftranquilwaters')
    await saveWeapon(sword, db)
    await expect(equipWeapon('yelan', sword.id, db)).rejects.toThrow(/can't use a Sword/)
    expect((await db.characters.get('yelan'))!.weaponId).toBeNull()
  })

  it('removing a weapon unequips it', async () => {
    const sword = newWeapon('splendoroftranquilwaters')
    await saveWeapon(sword, db)
    await equipWeapon('furina', sword.id, db)
    await removeWeapon(sword.id, db)
    expect((await db.characters.get('furina'))!.weaponId).toBeNull()
    expect(await db.weapons.count()).toBe(0)
  })

  it('removing a character keeps its weapon but drops its team and goals', async () => {
    const sword = newWeapon('splendoroftranquilwaters')
    await saveWeapon(sword, db)
    await equipWeapon('furina', sword.id, db)
    await db.teams.add({ characterKey: 'furina', teammates: ['yelan'] })
    await db.goals.add({
      id: 'g',
      characterKey: 'furina',
      targetLevel: 90,
      targetAscension: 6,
      targetTalents: { normal: 1, skill: 10, burst: 10 },
      createdAt: '2026-09-23',
    })
    await removeCharacter('furina', db)
    expect(await db.characters.get('furina')).toBeUndefined()
    expect(await db.weapons.count()).toBe(1)
    expect(await db.teams.count()).toBe(0)
    expect(await db.goals.count()).toBe(0)
  })

  it('rejects unknown keys', async () => {
    await expect(saveCharacter(newCharacter('notacharacter'), db)).rejects.toThrow()
  })
})
