// Goals and owned material counts.

import { getCharacter } from '../data'
import { GOAL_MAX_LEVEL } from '../engine/materials'
import { db as defaultDb, type AppDatabase } from '.'
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
