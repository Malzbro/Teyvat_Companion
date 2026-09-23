import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '.'
import { equipArtifact, removeArtifact, saveArtifact } from './artifacts'
import { newCharacter, saveCharacter } from './roster'
import type { Artifact } from './types'

let db: AppDatabase

const flower = (id: string): Artifact => ({
  id,
  setKey: 'goldentroupe',
  slot: 'flower',
  rarity: 5,
  level: 20,
  mainStat: 'hp',
  substats: [
    { key: 'critRate_', value: 0.078 },
    { key: 'critDMG_', value: 0.14 },
    { key: 'hp_', value: 0.053 },
    { key: 'enerRech_', value: 0.065 },
  ],
})

beforeEach(async () => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`)
  await saveCharacter(newCharacter('furina'), db)
  await saveCharacter(newCharacter('yelan'), db)
})

afterEach(async () => {
  await db.delete()
})

describe('artifacts', () => {
  it('refuses to save an invalid artifact', async () => {
    await expect(saveArtifact({ ...flower('a'), mainStat: 'atk' }, db)).rejects.toThrow(
      /can't have ATK/,
    )
    expect(await db.artifacts.count()).toBe(0)
  })

  it('equips, moves between characters, and replaces the slot', async () => {
    await saveArtifact(flower('a'), db)
    await saveArtifact(flower('b'), db)
    await equipArtifact('furina', 'a', db)
    await equipArtifact('yelan', 'a', db)
    expect((await db.characters.get('furina'))!.artifactIds.flower).toBeNull()
    expect((await db.characters.get('yelan'))!.artifactIds.flower).toBe('a')

    await equipArtifact('yelan', 'b', db)
    expect((await db.characters.get('yelan'))!.artifactIds.flower).toBe('b')
  })

  it('unequips with null and on delete', async () => {
    await saveArtifact(flower('a'), db)
    await equipArtifact('furina', 'a', db)
    await equipArtifact(null, 'a', db)
    expect((await db.characters.get('furina'))!.artifactIds.flower).toBeNull()

    await equipArtifact('furina', 'a', db)
    await removeArtifact('a', db)
    expect((await db.characters.get('furina'))!.artifactIds.flower).toBeNull()
    expect(await db.artifacts.count()).toBe(0)
  })
})
