// Artifact actions. Who wears what lives on the character (artifactIds per slot).

import { validateArtifact } from '../engine/artifact'
import { db as defaultDb, type AppDatabase } from '.'
import type { Artifact, OwnedCharacter } from './types'

/** Saves an artifact, or throws with the first validation problem. */
export async function saveArtifact(artifact: Artifact, db: AppDatabase = defaultDb) {
  const errors = validateArtifact(artifact)
  if (errors.length) throw new Error(errors[0])
  await db.transaction('rw', [db.artifacts, db.characters], async () => {
    const before = await db.artifacts.get(artifact.id)
    await db.artifacts.put(artifact)
    // If the slot changed, the old holder can't keep it in the old slot.
    if (before && before.slot !== artifact.slot) {
      const holder = await findHolder(artifact.id, db)
      if (holder) await unequipFrom(holder, artifact.id, db)
    }
  })
}

/** Deletes an artifact and takes it off whoever wears it. */
export async function removeArtifact(id: string, db: AppDatabase = defaultDb) {
  await db.transaction('rw', [db.artifacts, db.characters], async () => {
    const holder = await findHolder(id, db)
    if (holder) await unequipFrom(holder, id, db)
    await db.artifacts.delete(id)
  })
}

/**
 * Puts an artifact on a character (or null to unequip). It leaves its previous
 * wearer, and replaces whatever the character had in that slot.
 */
export async function equipArtifact(
  characterKey: string | null,
  artifactId: string,
  db: AppDatabase = defaultDb,
) {
  await db.transaction('rw', [db.artifacts, db.characters], async () => {
    const artifact = await db.artifacts.get(artifactId)
    if (!artifact) throw new Error('That artifact no longer exists.')
    const holder = await findHolder(artifactId, db)
    if (holder && holder.key !== characterKey) await unequipFrom(holder, artifactId, db)
    if (!characterKey) return
    const character = await db.characters.get(characterKey)
    if (!character) throw new Error('That character is not in the roster.')
    await db.characters.update(characterKey, {
      artifactIds: { ...character.artifactIds, [artifact.slot]: artifactId },
    })
  })
}

export async function findHolder(artifactId: string, db: AppDatabase = defaultDb) {
  return db.characters.filter((c) => Object.values(c.artifactIds).includes(artifactId)).first()
}

async function unequipFrom(character: OwnedCharacter, artifactId: string, db: AppDatabase) {
  const artifactIds = { ...character.artifactIds }
  for (const slot of Object.keys(artifactIds) as (keyof typeof artifactIds)[])
    if (artifactIds[slot] === artifactId) artifactIds[slot] = null
  await db.characters.update(character.key, { artifactIds })
}

/** Reads a small app setting. */
export async function getSetting<T>(key: string, fallback: T, db: AppDatabase = defaultDb) {
  return ((await db.settings.get(key))?.value as T | undefined) ?? fallback
}

export async function setSetting(key: string, value: unknown, db: AppDatabase = defaultDb) {
  await db.settings.put({ key, value })
}
