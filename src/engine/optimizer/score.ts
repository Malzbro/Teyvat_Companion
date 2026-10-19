// Build score (Step 10):
// Damage dealers: Score = ScalingStat × (1 + DMG%) × (1 + min(CR,1) × CD) × ReactionMult
// Supports: Score = ScalingStat × (1 + Healing Bonus, healers only) × SetWeight
//   (their value is the buff/heal/shield, which scales on one stat; crit and DMG% don't help,
//   and their 4pc set buffs the team, which the stat screen can't show).
// Enemy DEF/RES are skipped: they don't change which build ranks higher.

import type { StatKey } from '../../data/types'
import type { DmgBlock } from '../modifiers'
import { reactionMultiplier, shredMultiplier, type DamageType, type Profile } from '../profiles'
import type { StatBlock } from '../stats'

const TYPE_DMG: Record<DamageType, keyof DmgBlock> = {
  normal: 'normal_dmg_',
  charged: 'charged_dmg_',
  skill: 'skill_dmg_',
  burst: 'burst_dmg_',
}

/** Ranking weight for a support wearing one of their team-buff sets (not a game number). */
export const SUPPORT_SET_WEIGHT = { fourPiece: 1.25, twoPlusTwo: 1.1 }

export interface ScoreParts {
  scaling: number
  /** DMG Bonus factor for damage dealers; Healing Bonus factor for healers. */
  dmgBonus: number
  crit: number
  reaction: number
  /** Teammates' enemy RES decrease (1 = none). */
  res: number
  /** Support set weight (1 for damage dealers). */
  set: number
  score: number
}

export const isSupport = (profile: Profile) => profile.role === 'support'

/** Set weight for a support from how many pieces of each set are worn. */
export function supportSetWeight(profile: Profile, counts: Record<string, number>): number {
  if (!isSupport(profile)) return 1
  if (profile.sets.fourPiece.some((k) => (counts[k] ?? 0) >= 4)) return SUPPORT_SET_WEIGHT.fourPiece
  if (profile.sets.twoPlusTwo.some(([a, b]) => (counts[a] ?? 0) >= 2 && (counts[b] ?? 0) >= 2))
    return SUPPORT_SET_WEIGHT.twoPlusTwo
  return 1
}

export function scoreParts(
  profile: Profile,
  final: StatBlock,
  dmg: DmgBlock,
  setCounts: Record<string, number> = {},
): ScoreParts {
  const scaling = final[profile.scaling]
  if (isSupport(profile)) {
    const dmgBonus = profile.healer ? 1 + final.heal_ : 1
    const set = supportSetWeight(profile, setCounts)
    return { scaling, dmgBonus, crit: 1, reaction: 1, res: 1, set, score: scaling * dmgBonus * set }
  }
  const elementKey = `${profile.damage.element.toLowerCase()}_dmg_` as StatKey
  const dmgBonus = 1 + final[elementKey] + dmg.dmg_ + dmg[TYPE_DMG[profile.damage.type]]
  const crit = 1 + Math.min(Math.max(final.critRate_, 0), 1) * final.critDMG_
  const reaction = reactionMultiplier(profile.reaction, final.eleMas, dmg.amplify_dmg_)
  const res = shredMultiplier(dmg.enemy_res_shred_)
  return {
    scaling,
    dmgBonus,
    crit,
    reaction,
    res,
    set: 1,
    score: scaling * dmgBonus * crit * reaction * res,
  }
}

export const meetsER = (profile: Profile, final: StatBlock) =>
  !profile.minER || final.enerRech_ >= profile.minER - 1e-9
