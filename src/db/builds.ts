// Saved builds (loadouts) and team comps. A build only points at gear; equipping it moves
// that gear onto the character, the same way equipping one piece does.

import { getCharacter, getWeapon, type ArtifactSlot } from '../data'
import { db as defaultDb, newId, type AppDatabase } from '.'
import type { Build, OwnedCharacter, TeamComp } from './types'

const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

/** A new build from what the character wears right now (or from given pieces). */
export function newBuild(
  character: Pick<OwnedCharacter, 'key' | 'weaponId' | 'artifactIds'>,
  name: string,
): Build {
  return {
    id: newId(),
    characterKey: character.key,
    name: name.trim() || 'Build',
    weaponId: character.weaponId,
    artifactIds: { ...character.artifactIds },
    createdAt: new Date().toISOString(),
  }
}

export async function saveBuild(build: Build, db: AppDatabase = defaultDb) {
  await db.builds.put({ ...build, name: build.name.trim() || 'Build' })
}

/** Deletes a build; teams that used it fall back to the character's equipped gear. */
export async function removeBuild(id: string, db: AppDatabase = defaultDb) {
  await db.transaction('rw', [db.builds, db.teamComps], async () => {
    await db.builds.delete(id)
    await db.teamComps.toCollection().modify((t) => {
      for (const m of t.members) if (m.buildId === id) m.buildId = null
    })
  })
}

/** True when the character wears exactly this build. */
export function isWearing(character: OwnedCharacter, build: Build) {
  return (
    character.weaponId === build.weaponId &&
    SLOTS.every((s) => character.artifactIds[s] === build.artifactIds[s])
  )
}

/**
 * Puts a build on its character. Pieces other characters wear move over; slots the build
 * leaves empty are emptied. Gear that no longer exists is skipped.
 */
export async function equipBuild(build: Build, db: AppDatabase = defaultDb) {
  await db.transaction('rw', [db.characters, db.weapons, db.artifacts], async () => {
    const me = await db.characters.get(build.characterKey)
    if (!me) throw new Error(`${getCharacter(build.characterKey)?.name} isn't in the roster.`)

    let weaponId = me.weaponId
    if (build.weaponId) {
      const weapon = await db.weapons.get(build.weaponId)
      if (weapon && getWeapon(weapon.key)?.type === getCharacter(me.key)?.weaponType) {
        weaponId = weapon.id
        await db.characters
          .filter((c) => c.weaponId === weapon.id && c.key !== me.key)
          .modify({ weaponId: null })
      }
    }

    const artifactIds = { ...me.artifactIds }
    const wanted = new Set<string>()
    for (const slot of SLOTS) {
      const id = build.artifactIds[slot]
      const artifact = id ? await db.artifacts.get(id) : undefined
      artifactIds[slot] = artifact && artifact.slot === slot ? artifact.id : null
      if (artifactIds[slot]) wanted.add(artifactIds[slot]!)
    }
    // Take the pieces off whoever else wears them.
    await db.characters
      .filter(
        (c) => c.key !== me.key && Object.values(c.artifactIds).some((id) => id && wanted.has(id)),
      )
      .modify((c) => {
        for (const slot of SLOTS)
          if (wanted.has(c.artifactIds[slot] ?? '')) c.artifactIds[slot] = null
      })
    await db.characters.update(me.key, { weaponId, artifactIds })
  })
}

// --- Team comps --------------------------------------------------------------

export function newTeamComp(name: string, members: TeamComp['members'], source?: string): TeamComp {
  return {
    id: newId(),
    name: name.trim() || 'Team',
    members: members.slice(0, 4),
    ...(source ? { source } : {}),
    createdAt: new Date().toISOString(),
  }
}

export async function saveTeamComp(team: TeamComp, db: AppDatabase = defaultDb) {
  await db.teamComps.put({
    ...team,
    name: team.name.trim() || 'Team',
    members: team.members.slice(0, 4),
  })
}

export async function removeTeamComp(id: string, db: AppDatabase = defaultDb) {
  await db.teamComps.delete(id)
}

/**
 * Gear two members' builds both need (an artifact or weapon can only be worn by one).
 * Returns the names of the members that clash, e.g. [["Furina", "Yelan"]].
 */
export function teamClashes(team: TeamComp, builds: Build[], owned: OwnedCharacter[]) {
  const gearOf = (m: TeamComp['members'][number]) => {
    const b = m.buildId ? builds.find((x) => x.id === m.buildId) : undefined
    const c = owned.find((x) => x.key === m.characterKey)
    const src = b ?? c
    if (!src) return new Set<string>()
    return new Set(
      [src.weaponId, ...Object.values(src.artifactIds)].filter((x): x is string => !!x),
    )
  }
  const gear = team.members.map(gearOf)
  const clashes: [string, string][] = []
  for (let i = 0; i < gear.length; i++)
    for (let j = i + 1; j < gear.length; j++)
      if ([...gear[i]].some((id) => gear[j].has(id)))
        clashes.push([
          getCharacter(team.members[i].characterKey)?.name ?? '?',
          getCharacter(team.members[j].characterKey)?.name ?? '?',
        ])
  return clashes
}

/**
 * "Use this team": equips each member's chosen build and makes the other three their
 * teammates on the character page (so resonance and the optimizer use this team).
 * Members not in the roster are skipped.
 */
export async function applyTeamComp(team: TeamComp, db: AppDatabase = defaultDb) {
  const owned = new Set((await db.characters.toArray()).map((c) => c.key))
  const members = team.members.filter((m) => owned.has(m.characterKey))
  for (const m of members) {
    const build = m.buildId ? await db.builds.get(m.buildId) : undefined
    if (build) await equipBuild(build, db)
  }
  const keys = team.members.map((m) => m.characterKey)
  await db.teams.bulkPut(
    members.map((m) => ({
      characterKey: m.characterKey,
      teammates: keys.filter((k) => k !== m.characterKey && owned.has(k)).slice(0, 3),
    })),
  )
}
