// Build score (Step 10):
// Score = ScalingStat × (1 + DMG%) × (1 + min(CR,1) × CD) × ReactionMult
// Enemy DEF/RES are skipped: they don't change which build ranks higher.

import type { StatKey } from '../../data/types'
import type { DmgBlock } from '../modifiers'
import { reactionMultiplier, type DamageType, type Profile } from '../profiles'
import type { StatBlock } from '../stats'

const TYPE_DMG: Record<DamageType, keyof DmgBlock> = {
  normal: 'normal_dmg_',
  charged: 'charged_dmg_',
  skill: 'skill_dmg_',
  burst: 'burst_dmg_',
}

export interface ScoreParts {
  scaling: number
  dmgBonus: number
  crit: number
  reaction: number
  score: number
}

export function scoreParts(profile: Profile, final: StatBlock, dmg: DmgBlock): ScoreParts {
  const scaling = final[profile.scaling]
  const elementKey = `${profile.damage.element.toLowerCase()}_dmg_` as StatKey
  const dmgBonus = 1 + final[elementKey] + dmg.dmg_ + dmg[TYPE_DMG[profile.damage.type]]
  const crit = 1 + Math.min(Math.max(final.critRate_, 0), 1) * final.critDMG_
  const reaction = reactionMultiplier(profile.reaction, final.eleMas, dmg.amplify_dmg_)
  return { scaling, dmgBonus, crit, reaction, score: scaling * dmgBonus * crit * reaction }
}

export const meetsER = (profile: Profile, final: StatBlock) =>
  !profile.minER || final.enerRech_ >= profile.minER - 1e-9
