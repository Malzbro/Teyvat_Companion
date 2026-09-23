// First-open data so the app isn't empty: her characters and Yelan's real build
// (from her stat screen, Step 7). Runs once per device and never over existing data.

import { SEED_CHARACTERS } from './config'
import { db as defaultDb, type AppDatabase, type Artifact } from './db'
import { equipArtifact } from './db/artifacts'
import { equipWeapon, newCharacter, newWeapon, saveCharacter, saveWeapon } from './db/roster'

const SEEDED_KEY = 'seeded-v1'

const yelanPieces: Omit<Artifact, 'id'>[] = [
  {
    setKey: 'emblemofseveredfate',
    slot: 'flower',
    rarity: 5,
    level: 20,
    mainStat: 'hp',
    substats: [
      { key: 'enerRech_', value: 0.065 },
      { key: 'critDMG_', value: 0.218 },
      { key: 'hp_', value: 0.082 },
      { key: 'critRate_', value: 0.093 },
    ],
  },
  {
    setKey: 'emblemofseveredfate',
    slot: 'plume',
    rarity: 5,
    level: 20,
    mainStat: 'atk',
    substats: [
      { key: 'critRate_', value: 0.109 },
      { key: 'critDMG_', value: 0.187 },
      { key: 'eleMas', value: 21 },
      { key: 'enerRech_', value: 0.065 },
    ],
  },
  {
    setKey: 'emblemofseveredfate',
    slot: 'sands',
    rarity: 5,
    level: 20,
    mainStat: 'hp_',
    substats: [
      { key: 'hp', value: 299 },
      { key: 'critRate_', value: 0.054 },
      { key: 'enerRech_', value: 0.11 },
      { key: 'critDMG_', value: 0.218 },
    ],
  },
  {
    setKey: 'heartofdepth',
    slot: 'goblet',
    rarity: 5,
    level: 20,
    mainStat: 'hydro_dmg_',
    substats: [
      { key: 'critRate_', value: 0.101 },
      { key: 'def', value: 21 },
      { key: 'critDMG_', value: 0.132 },
      { key: 'hp_', value: 0.087 },
    ],
  },
  {
    setKey: 'emblemofseveredfate',
    slot: 'circlet',
    rarity: 5,
    level: 20,
    mainStat: 'critRate_',
    substats: [
      { key: 'critDMG_', value: 0.21 },
      { key: 'enerRech_', value: 0.117 },
      { key: 'def_', value: 0.124 },
      { key: 'hp', value: 478 },
    ],
  },
]

const alreadySeeded = () => {
  try {
    return localStorage.getItem(SEEDED_KEY) === '1'
  } catch {
    return false // No storage: fall back to the character-count check.
  }
}

/** Adds her starting data the first time the app opens on this device. */
export async function seedIfFirstRun(db: AppDatabase = defaultDb): Promise<boolean> {
  if (alreadySeeded()) return false

  // All or nothing: if the app closes halfway, nothing is saved and it seeds next time.
  const seeded = await db.transaction('rw', [db.characters, db.weapons, db.artifacts], async () => {
    if ((await db.characters.count()) > 0) return false
    for (const key of SEED_CHARACTERS)
      await saveCharacter(
        key === 'yelan'
          ? { ...newCharacter(key), constellation: 6, favourite: true }
          : newCharacter(key),
        db,
      )
    const aqua = { ...newWeapon('aquasimulacra'), refinement: 4 }
    await saveWeapon(aqua, db)
    await equipWeapon('yelan', aqua.id, db)
    for (const piece of yelanPieces) {
      const artifact = { ...piece, id: crypto.randomUUID() }
      await db.artifacts.put(artifact)
      await equipArtifact('yelan', artifact.id, db)
    }
    return true
  })

  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // Without storage the character count check still prevents seeding twice.
  }
  return seeded
}
