// "Use this team + gear" for a team the Optimise screen suggested.

import { db as defaultDb, type AppDatabase } from '.'
import { equipArtifact } from './artifacts'
import { newTeamComp, saveTeamComp } from './builds'
import type { TeamPlan } from '../engine/teams/suggest'

/**
 * Wears each member's suggested artifacts (taking them off whoever has them now), makes the
 * other three each member's teammates, and saves the party on the Teams tab.
 */
export async function applyTeamPlan(
  name: string,
  party: string[],
  plan: TeamPlan,
  db: AppDatabase = defaultDb,
) {
  for (const member of plan.members) {
    if (!member.build) continue
    for (const slot of member.build.swaps) {
      const id = member.build.pieces[slot]
      if (id) await equipArtifact(member.key, id, db)
    }
  }
  const owned = new Set((await db.characters.toArray()).map((c) => c.key))
  const inRoster = party.filter((k) => owned.has(k))
  await db.teams.bulkPut(
    inRoster.map((k) => ({ characterKey: k, teammates: inRoster.filter((x) => x !== k) })),
  )
  await saveTeamComp(
    newTeamComp(
      name,
      party.map((characterKey) => ({ characterKey, buildId: null })),
      'Optimiser',
    ),
    db,
  )
}
