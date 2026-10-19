// Talent scaling tables (Step 17), from genshin-db via npm run build:data. Kept out of
// src/data/index.ts so only the code that needs them (rotations) pulls in the ~400 KB file.

import talentsJson from './generated/talents.json'
import type { TalentKind, TalentTable, TalentTables } from './types'

const tables = talentsJson as Record<string, TalentTables>

export const getTalentTable = (characterKey: string, kind: TalentKind): TalentTable | undefined =>
  tables[characterKey]?.[kind]

/**
 * Values for one label at a talent level, e.g. ("clorinde", "skill", "Swift Hunt DMG", 10) →
 * [0.4396, 0.6588] for "{param1}/{param2}". Throws if the label isn't there (so a renamed label
 * in a genshin-db update is caught by the tests, not silently scored as 0).
 */
export function talentValues(
  characterKey: string,
  kind: TalentKind,
  label: string,
  level: number,
): number[] {
  const table = getTalentTable(characterKey, kind)
  const row = table?.labels.find((l) => l.split('|')[0] === label)
  if (!table || !row) throw new Error(`No "${label}" in ${characterKey}'s ${kind} talent`)
  const params = [...row.matchAll(/\{(param\d+)/g)].map((m) => m[1])
  return params.map((p) => {
    const values = table.params[p]
    return values[Math.max(0, Math.min(level - 1, values.length - 1))]
  })
}
