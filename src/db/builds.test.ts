import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '.'
import type { Artifact } from './types'
import {
  applyTeamComp,
  equipBuild,
  isWearing,
  newBuild,
  newTeamComp,
  removeBuild,
  saveBuild,
  saveTeamComp,
  teamClashes,
} from './builds'
import { newCharacter, newWeapon, removeCharacter, saveCharacter, saveWeapon } from './roster'

let db: AppDatabase
const piece = (id: string, slot: Artifact['slot']): Artifact => ({
  id,
  setKey: 'goldentroupe',
  slot,
  rarity: 5,
  level: 20,
  mainStat: slot === 'flower' ? 'hp' : 'atk',
  substats: [],
})

beforeEach(async () => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`)
  await saveCharacter(newCharacter('furina'), db)
  await saveCharacter(newCharacter('clorinde'), db)
  await saveCharacter(newCharacter('yelan'), db)
  await db.artifacts.bulkPut([piece('f1', 'flower'), piece('f2', 'flower'), piece('p1', 'plume')])
})

afterEach(async () => {
  await db.delete()
})

describe('builds', () => {
  it('saves the current gear and equips it back later', async () => {
    const sword = newWeapon('splendoroftranquilwaters')
    await saveWeapon(sword, db)
    await db.characters.update('furina', {
      weaponId: sword.id,
      artifactIds: { flower: 'f1', plume: 'p1', sands: null, goblet: null, circlet: null },
    })
    const build = newBuild((await db.characters.get('furina'))!, 'Main')
    await saveBuild(build, db)

    // Clorinde takes the flower and sword, Furina switches flowers.
    await db.characters.update('clorinde', {
      weaponId: sword.id,
      artifactIds: { flower: 'f1', plume: null, sands: null, goblet: null, circlet: null },
    })
    await db.characters.update('furina', {
      weaponId: null,
      artifactIds: { flower: 'f2', plume: null, sands: null, goblet: null, circlet: null },
    })

    await equipBuild(build, db)
    const furina = (await db.characters.get('furina'))!
    const clorinde = (await db.characters.get('clorinde'))!
    expect(isWearing(furina, build)).toBe(true)
    expect(clorinde.weaponId).toBeNull()
    expect(clorinde.artifactIds.flower).toBeNull()
  })

  it('removing a build resets teams that used it; removing a character drops its builds', async () => {
    const build = newBuild((await db.characters.get('furina'))!, 'Support')
    await saveBuild(build, db)
    const team = newTeamComp('Hydro', [{ characterKey: 'furina', buildId: build.id }])
    await saveTeamComp(team, db)
    await removeBuild(build.id, db)
    expect((await db.teamComps.get(team.id))!.members[0].buildId).toBeNull()

    await saveBuild(newBuild((await db.characters.get('yelan'))!, 'x'), db)
    await removeCharacter('yelan', db)
    expect(await db.builds.where('characterKey').equals('yelan').count()).toBe(0)
  })
})

describe('team comps', () => {
  it('lets the same character be in several teams and flags shared gear', async () => {
    const a = newBuild(
      {
        key: 'furina',
        weaponId: null,
        artifactIds: { flower: 'f1', plume: null, sands: null, goblet: null, circlet: null },
      },
      'A',
    )
    const b = newBuild(
      {
        key: 'clorinde',
        weaponId: null,
        artifactIds: { flower: 'f1', plume: null, sands: null, goblet: null, circlet: null },
      },
      'B',
    )
    const t1 = newTeamComp('One', [
      { characterKey: 'furina', buildId: a.id },
      { characterKey: 'clorinde', buildId: b.id },
    ])
    const t2 = newTeamComp('Two', [{ characterKey: 'furina', buildId: null }])
    await saveTeamComp(t1, db)
    await saveTeamComp(t2, db)
    expect(await db.teamComps.count()).toBe(2)
    expect(teamClashes(t1, [a, b], await db.characters.toArray())).toEqual([['Furina', 'Clorinde']])
  })

  it('using a team equips builds and sets everyone’s teammates', async () => {
    const build = newBuild(
      {
        key: 'yelan',
        weaponId: null,
        artifactIds: { flower: 'f2', plume: 'p1', sands: null, goblet: null, circlet: null },
      },
      'Burst',
    )
    await saveBuild(build, db)
    const team = newTeamComp('Hydro', [
      { characterKey: 'yelan', buildId: build.id },
      { characterKey: 'furina', buildId: null },
      { characterKey: 'navia', buildId: null }, // not owned: skipped
      { characterKey: 'clorinde', buildId: null },
    ])
    await applyTeamComp(team, db)
    expect((await db.characters.get('yelan'))!.artifactIds.flower).toBe('f2')
    expect((await db.teams.get('yelan'))!.teammates).toEqual(['furina', 'clorinde'])
    expect(await db.teams.get('navia')).toBeUndefined()
  })
})
