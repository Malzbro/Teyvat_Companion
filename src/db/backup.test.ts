import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, exportData, importData } from '.'
import type { BackupFile } from './backup'

let db: AppDatabase

beforeEach(() => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await db.delete()
})

async function seed() {
  await db.characters.add({
    key: 'furina',
    level: 90,
    ascension: 6,
    constellation: 1,
    talents: { normal: 1, skill: 9, burst: 10 },
    weaponId: 'w1',
    artifactIds: { flower: 'a1', plume: null, sands: null, goblet: null, circlet: null },
    locked: true,
    favourite: true,
  })
  await db.weapons.add({
    id: 'w1',
    key: 'splendoroftranquilwaters',
    level: 90,
    ascension: 6,
    refinement: 1,
  })
  await db.artifacts.add({
    id: 'a1',
    setKey: 'goldentroupe',
    slot: 'flower',
    rarity: 5,
    level: 20,
    mainStat: 'hp',
    substats: [
      { key: 'critRate_', value: 0.101 },
      { key: 'critDMG_', value: 0.21 },
      { key: 'hp_', value: 0.058 },
      { key: 'enerRech_', value: 0.052 },
    ],
  })
  await db.materials.bulkAdd([
    { id: 104343, count: 12 },
    { id: 202, count: 1_500_000 },
  ])
  await db.goals.add({
    id: 'g1',
    characterKey: 'furina',
    targetLevel: 90,
    targetAscension: 6,
    targetTalents: { normal: 1, skill: 10, burst: 10 },
    createdAt: '2026-09-23T00:00:00.000Z',
  })
  await db.teams.add({ characterKey: 'furina', teammates: ['yelan', 'xilonen', 'bennett'] })
  await db.settings.add({ key: 'lastArtifactSet', value: 'goldentroupe' })
}

describe('backup', () => {
  it('round-trips: save → export → wipe → import → identical', async () => {
    await seed()
    const exported = await exportData(db)
    // Simulate a real file: through JSON text and back.
    const file = JSON.parse(JSON.stringify(exported)) as BackupFile

    await Promise.all(db.tables.map((t) => t.clear()))
    expect(await db.characters.count()).toBe(0)

    await importData(db, file)
    const reExported = await exportData(db)
    expect(reExported.data).toEqual(exported.data)
    expect(reExported.data.characters).toHaveLength(1)
    expect(reExported.data.materials).toHaveLength(2)
  })

  it('import replaces existing data instead of merging', async () => {
    await seed()
    const exported = await exportData(db)
    await db.weapons.add({ id: 'extra', key: 'dullblade', level: 1, ascension: 0, refinement: 1 })
    await importData(db, exported)
    expect(await db.weapons.count()).toBe(1)
  })

  it('rejects files that are not backups', async () => {
    await expect(importData(db, { hello: 'world' })).rejects.toThrow(/isn't a Teyvat Companion/)
    await expect(
      importData(db, { app: 'teyvat-companion', formatVersion: 99, data: {} }),
    ).rejects.toThrow(/newer version/)
  })
})
