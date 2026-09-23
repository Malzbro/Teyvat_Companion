// Merging an Enka showcase into her data. Nothing changes until she picks what to import.

import type { EnkaCharacter } from '../engine/enka'
import { ARTIFACT_SLOTS } from '../engine/artifact'
import { db as defaultDb, newId, type AppDatabase } from '.'
import { equipArtifact } from './artifacts'
import { equipWeapon, newCharacter, saveCharacter, saveWeapon } from './roster'
import type { Artifact, OwnedCharacter, OwnedWeapon } from './types'

export interface ImportPlanItem {
  incoming: EnkaCharacter
  status: 'new' | 'changed' | 'same'
  /** What would change, in plain words. */
  changes: string[]
}

function sameArtifact(a: Omit<Artifact, 'id'>, b: Omit<Artifact, 'id'>) {
  if (
    a.setKey !== b.setKey ||
    a.slot !== b.slot ||
    a.rarity !== b.rarity ||
    a.level !== b.level ||
    a.mainStat !== b.mainStat ||
    a.substats.length !== b.substats.length
  )
    return false
  return a.substats.every((s) =>
    b.substats.some((t) => t.key === s.key && Math.abs(t.value - s.value) < 1e-6),
  )
}

/** Compares the showcase with what's saved and lists the differences. */
export async function planImport(
  incoming: EnkaCharacter[],
  db: AppDatabase = defaultDb,
): Promise<ImportPlanItem[]> {
  const [owned, weapons, artifacts] = await Promise.all([
    db.characters.toArray(),
    db.weapons.toArray(),
    db.artifacts.toArray(),
  ])
  return incoming.map((c) => {
    const current = owned.find((o) => o.key === c.key)
    if (!current) return { incoming: c, status: 'new', changes: ['Not in the roster yet'] }
    const changes: string[] = []
    if (current.level !== c.level || current.ascension !== c.ascension)
      changes.push(`Level ${current.level} → ${c.level}`)
    if (current.constellation !== c.constellation)
      changes.push(`C${current.constellation} → C${c.constellation}`)
    const t = (x: OwnedCharacter['talents']) => `${x.normal}/${x.skill}/${x.burst}`
    if (t(current.talents) !== t(c.talents))
      changes.push(`Talents ${t(current.talents)} → ${t(c.talents)}`)
    const weapon = weapons.find((w) => w.id === current.weaponId)
    if (c.weapon) {
      if (!weapon || weapon.key !== c.weapon.key) changes.push(`Weapon → ${c.weapon.name}`)
      else if (
        weapon.level !== c.weapon.level ||
        weapon.ascension !== c.weapon.ascension ||
        weapon.refinement !== c.weapon.refinement
      )
        changes.push(`${c.weapon.name} → Lv. ${c.weapon.level} R${c.weapon.refinement}`)
    }
    const differentPieces = c.artifacts.filter((a) => {
      const worn = artifacts.find((x) => x.id === current.artifactIds[a.slot])
      return !worn || !sameArtifact(worn, a)
    }).length
    if (differentPieces)
      changes.push(`${differentPieces} ${differentPieces === 1 ? 'artifact' : 'artifacts'}`)
    return { incoming: c, status: changes.length ? 'changed' : 'same', changes }
  })
}

/** Imports the chosen characters: level/talents, weapon and worn artifacts. Keeps her favourites, locks and teams. */
export async function applyImport(chosen: EnkaCharacter[], db: AppDatabase = defaultDb) {
  let artifactsAdded = 0
  let weaponsAdded = 0
  for (const c of chosen) {
    const current = await db.characters.get(c.key)
    await saveCharacter(
      {
        ...(current ?? newCharacter(c.key)),
        level: c.level,
        ascension: c.ascension,
        constellation: c.constellation,
        talents: c.talents,
      },
      db,
    )

    if (c.weapon) {
      const all = await db.weapons.toArray()
      const worn = current?.weaponId ? all.find((w) => w.id === current.weaponId) : undefined
      let target: OwnedWeapon | undefined =
        worn?.key === c.weapon.key
          ? worn
          : all.find(
              (w) =>
                w.key === c.weapon!.key &&
                w.refinement === c.weapon!.refinement &&
                w.level === c.weapon!.level,
            )
      if (!target) {
        target = { id: newId(), key: c.weapon.key, level: 1, ascension: 0, refinement: 1 }
        weaponsAdded++
      }
      await saveWeapon(
        {
          ...target,
          level: c.weapon.level,
          ascension: c.weapon.ascension,
          refinement: c.weapon.refinement,
        },
        db,
      )
      await equipWeapon(c.key, target.id, db)
    }

    const existing = await db.artifacts.toArray()
    for (const slot of ARTIFACT_SLOTS) {
      const incoming = c.artifacts.find((a) => a.slot === slot)
      if (!incoming) continue // Keep whatever she has in a slot the showcase leaves empty.
      let match = existing.find((a) => sameArtifact(a, incoming))
      if (!match) {
        // Game data is trusted as-is (no validation), so rounding quirks never block an import.
        match = { ...incoming, id: newId() }
        await db.artifacts.put(match)
        artifactsAdded++
      }
      await equipArtifact(c.key, match.id, db)
    }
  }
  return { characters: chosen.length, weaponsAdded, artifactsAdded }
}
