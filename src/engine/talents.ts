// Constellation talent boosts: C3 and C5 each raise one talent by 3 levels (up to 13).
// Which talent is read from game data (it differs per character: Yelan's C3 is her Burst).
// Stored talent levels are always the base level (1–10), which is what material costs use.

import { getCharacter } from '../data'
import type { TalentKind } from '../data/types'
import type { TalentLevels } from '../db/types'

export const TALENT_BOOST = 3

/** Extra levels per talent from constellations (0 or 3 each). */
export function talentBonus(characterKey: string, constellation: number): TalentLevels {
  const bonus: TalentLevels = { normal: 0, skill: 0, burst: 0 }
  const boosts = getCharacter(characterKey)?.talentBoosts
  if (!boosts) return bonus
  if (constellation >= 3 && boosts.c3) bonus[boosts.c3] += TALENT_BOOST
  if (constellation >= 5 && boosts.c5) bonus[boosts.c5] += TALENT_BOOST
  return bonus
}

/** Talent levels as shown in the game (base + constellation boost). */
export function shownTalents(
  characterKey: string,
  constellation: number,
  talents: TalentLevels,
): TalentLevels {
  const bonus = talentBonus(characterKey, constellation)
  return {
    normal: talents.normal + bonus.normal,
    skill: talents.skill + bonus.skill,
    burst: talents.burst + bonus.burst,
  }
}

/** "10/13/13" */
export function talentText(characterKey: string, constellation: number, talents: TalentLevels) {
  const t = shownTalents(characterKey, constellation, talents)
  return `${t.normal}/${t.skill}/${t.burst}`
}

export type { TalentKind }
