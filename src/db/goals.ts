// Goals and owned material counts.

import { getCharacter } from '../data'
import { GOAL_MAX_LEVEL } from '../engine/materials'
import { db as defaultDb, newId, type AppDatabase } from '.'
import type { Goal } from './types'

export async function saveGoal(goal: Goal, db: AppDatabase = defaultDb) {
  if (!getCharacter(goal.characterKey)) throw new Error('Unknown character.')
  if (
    goal.targetLevel > GOAL_MAX_LEVEL ||
    (goal.weapon && goal.weapon.targetLevel > GOAL_MAX_LEVEL)
  )
    throw new Error(`Goals go up to Lv ${GOAL_MAX_LEVEL}.`)
  await db.goals.put(goal)
}

export async function removeGoal(id: string, db: AppDatabase = defaultDb) {
  await db.goals.delete(id)
}

/** Sets how many of a material she owns (never below 0). */
export async function setMaterialCount(id: number, count: number, db: AppDatabase = defaultDb) {
  await db.materials.put({ id, count: Math.max(0, Math.floor(count)) })
}

/** Goal targets for one character (as teamPotential returns them). */
export interface GoalTarget {
  characterKey: string
  targetLevel: number
  targetAscension: number
  targetTalents: Goal['targetTalents']
  weapon?: Goal['weapon']
}

/** A goal reaching both: the higher of each target (one goal per character). */
export function mergeGoal(existing: Goal | undefined, target: GoalTarget): Goal {
  if (!existing) return { id: newId(), ...target, createdAt: new Date().toISOString() }
  const t = existing.targetTalents
  const weapon =
    existing.weapon && target.weapon && existing.weapon.weaponId === target.weapon.weaponId
      ? {
          weaponId: existing.weapon.weaponId,
          targetLevel: Math.max(existing.weapon.targetLevel, target.weapon.targetLevel),
          targetAscension: Math.max(existing.weapon.targetAscension, target.weapon.targetAscension),
        }
      : (target.weapon ?? existing.weapon)
  return {
    ...existing,
    targetLevel: Math.max(existing.targetLevel, target.targetLevel),
    targetAscension: Math.max(existing.targetAscension, target.targetAscension),
    targetTalents: {
      normal: Math.max(t.normal, target.targetTalents.normal),
      skill: Math.max(t.skill, target.targetTalents.skill),
      burst: Math.max(t.burst, target.targetTalents.burst),
    },
    ...(weapon ? { weapon } : {}),
  }
}

/** "Optimise & track": adds the team to the tracker and raises each member's goal to its target. */
export async function trackTeam(
  teamId: string,
  targets: GoalTarget[],
  db: AppDatabase = defaultDb,
) {
  await db.transaction('rw', db.goals, db.teamComps, async () => {
    for (const target of targets) {
      const existing = await db.goals.where('characterKey').equals(target.characterKey).first()
      await saveGoal(mergeGoal(existing, target), db)
    }
    await db.teamComps.update(teamId, { trackedAt: new Date().toISOString() })
  })
}

/** Stops tracking a team; the members' goals stay (other teams or she may still want them). */
export async function untrackTeam(teamId: string, db: AppDatabase = defaultDb) {
  await db.teamComps.update(teamId, { trackedAt: undefined })
}
