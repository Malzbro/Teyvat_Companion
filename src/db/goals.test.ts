import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '.'
import { newTeamComp, saveTeamComp } from './builds'
import { mergeGoal, saveGoal, trackTeam, untrackTeam } from './goals'

let db: AppDatabase
beforeEach(() => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  db.close()
  await db.delete()
})

const target = {
  characterKey: 'clorinde',
  targetLevel: 90,
  targetAscension: 6,
  targetTalents: { normal: 10, skill: 10, burst: 6 },
}

describe('tracking a team', () => {
  it('a character in two teams keeps the higher target of each', () => {
    const goal = mergeGoal(undefined, { ...target, targetLevel: 80, targetAscension: 5 })
    const merged = mergeGoal({ ...goal, targetTalents: { normal: 6, skill: 6, burst: 9 } }, target)
    expect(merged.id).toBe(goal.id)
    expect(merged.targetLevel).toBe(90)
    expect(merged.targetAscension).toBe(6)
    expect(merged.targetTalents).toEqual({ normal: 10, skill: 10, burst: 9 })
  })

  it('raises existing goals, adds new ones and marks the team tracked', async () => {
    const team = newTeamComp('Clorinde', [
      { characterKey: 'clorinde', buildId: null },
      { characterKey: 'fischl', buildId: null },
    ])
    await saveTeamComp(team, db)
    await saveGoal(
      { ...mergeGoal(undefined, target), targetTalents: { normal: 1, skill: 1, burst: 9 } },
      db,
    )
    await trackTeam(
      team.id,
      [
        target,
        { ...target, characterKey: 'fischl', targetTalents: { normal: 1, skill: 10, burst: 10 } },
      ],
      db,
    )
    const goals = await db.goals.orderBy('characterKey').toArray()
    expect(goals.map((g) => g.characterKey)).toEqual(['clorinde', 'fischl'])
    expect(goals[0].targetTalents).toEqual({ normal: 10, skill: 10, burst: 9 })
    expect((await db.teamComps.get(team.id))?.trackedAt).toBeTruthy()
    await untrackTeam(team.id, db)
    expect((await db.teamComps.get(team.id))?.trackedAt).toBeUndefined()
    expect(await db.goals.count()).toBe(2)
  })
})
