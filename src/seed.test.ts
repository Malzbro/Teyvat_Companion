import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from './db'
import { newCharacter, saveCharacter } from './db/roster'
import { validateArtifact } from './engine/artifact'
import { seedIfFirstRun } from './seed'

let db: AppDatabase
beforeEach(() => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`)
  localStorage.removeItem('seeded-v1')
})
afterEach(async () => {
  await db.delete()
})

describe('first-run seed', () => {
  it('adds her 15 characters and Yelan’s real build, once', async () => {
    expect(await seedIfFirstRun(db)).toBe(true)
    expect(await db.characters.count()).toBe(15)
    const yelan = (await db.characters.get('yelan'))!
    expect(yelan).toMatchObject({ constellation: 6, favourite: true, level: 90 })
    expect(Object.values(yelan.artifactIds).every(Boolean)).toBe(true)
    expect((await db.weapons.get(yelan.weaponId!))!).toMatchObject({
      key: 'aquasimulacra',
      refinement: 4,
    })
    for (const a of await db.artifacts.toArray()) expect(validateArtifact(a), a.slot).toEqual([])

    expect(await seedIfFirstRun(db)).toBe(false)
    expect(await db.characters.count()).toBe(15)
  })

  it('never seeds over existing data', async () => {
    await saveCharacter(newCharacter('furina'), db)
    expect(await seedIfFirstRun(db)).toBe(false)
    expect(await db.characters.count()).toBe(1)
  })
})
