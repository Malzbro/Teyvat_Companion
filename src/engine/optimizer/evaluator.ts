// Fast build evaluation for the optimizer. Gives the same numbers as computeBuild,
// but precomputes everything that doesn't depend on the artifacts and caches set effects.

import {
  CHARACTER_BASE_CRIT,
  characterBaseStats,
  getCharacter,
  getWeapon,
  weaponStats,
  type ArtifactSlot,
  type CharacterData,
  type StatKey,
} from '../../data'
import type { Artifact } from '../../db/types'
import { mainStatValue } from '../artifact'
import {
  amount,
  emptyDmg,
  isDmgKey,
  merge,
  resonanceModifiers,
  setModifiers,
  weaponModifiers,
  type ConditionState,
  type DmgBlock,
  type Modifier,
} from '../modifiers'
import { reactionMultiplier, type Profile } from '../profiles'
import { TWO_PIECE_STATS } from '../setBonus'
import { emptyStats, type StatBlock } from '../stats'
import { meetsER, scoreParts, type ScoreParts } from './score'

export interface EvaluatorInput {
  characterKey: string
  level: number
  ascension: number
  weapon?: { key: string; level: number; ascension: number; refinement: number }
  teammates: string[]
  conditions: ConditionState
  profile: Profile
}

export interface Evaluation extends ScoreParts {
  final: StatBlock
  dmg: DmgBlock
  erOk: boolean
}

const KEYS = Object.keys(emptyStats()) as StatKey[]

/** An artifact's stats as a plain block (main stat at its level + substats). */
export function artifactVector(a: Artifact): StatBlock {
  const v = emptyStats()
  v[a.mainStat] += mainStatValue(a.rarity, a.mainStat, a.level)
  for (const s of a.substats) v[s.key] += s.value
  return v
}

interface SetPart {
  stats: StatBlock
  dmg: DmgBlock
  fromStats: Modifier[]
}

export function makeEvaluator(input: EvaluatorInput) {
  const character = getCharacter(input.characterKey) as CharacterData
  const teammates = input.teammates.map(getCharacter).filter((c): c is CharacterData => !!c)
  const weaponData = input.weapon && getWeapon(input.weapon.key)
  const weapon = input.weapon && weaponData ? { ...input.weapon, data: weaponData } : undefined
  const state = input.conditions

  // Everything independent of artifacts.
  const own = characterBaseStats(character, input.level, input.ascension)
  const bonus = emptyStats()
  bonus.critRate_ += CHARACTER_BASE_CRIT.critRate_
  bonus.critDMG_ += CHARACTER_BASE_CRIT.critDMG_
  bonus.enerRech_ += 1
  bonus[own.ascensionStat] += own.ascensionValue
  let weaponAtk = 0
  if (weapon) {
    const w = weaponStats(weapon.data, weapon.level, weapon.ascension)
    weaponAtk = w.atk
    if (w.substat) bonus[w.substat] += w.substatValue
  }
  const base = { hp: own.hp, atk: own.atk + weaponAtk, def: own.def }

  const ctx0 = { character, setCounts: {}, teammates }
  const fixed = merge(resonanceModifiers(ctx0), weaponModifiers(weapon, character))
  const fixedConditions = new Map(fixed.conditions.map((c) => [c.id, c]))
  const fixedDmg = emptyDmg()
  for (const mod of fixed.modifiers) {
    const value = amount(mod, fixedConditions, state)
    if (!value) continue
    if (isDmgKey(mod.stat)) fixedDmg[mod.stat] += value
    else bonus[mod.stat as StatKey] += value
  }

  // Set effects depend only on how many pieces of each set are worn.
  const setCache = new Map<string, SetPart>()
  function setPart(pieces: (Artifact | null)[]): SetPart {
    const counts: Record<string, number> = {}
    for (const p of pieces) if (p) counts[p.setKey] = (counts[p.setKey] ?? 0) + 1
    const cacheKey = Object.entries(counts)
      .filter(([, n]) => n >= 2)
      .map(([k, n]) => `${k}:${n >= 4 ? 4 : 2}`)
      .sort()
      .join('|')
    const hit = setCache.get(cacheKey)
    if (hit) return hit
    const part: SetPart = { stats: emptyStats(), dmg: emptyDmg(), fromStats: [] }
    for (const [key, n] of Object.entries(counts)) {
      const two = TWO_PIECE_STATS[key]
      if (n >= 2 && two) part.stats[two.key] += two.value
    }
    const mods = setModifiers({ character, setCounts: counts, teammates })
    const conds = new Map(mods.conditions.map((c) => [c.id, c]))
    for (const mod of mods.modifiers) {
      if (mod.fromStats) {
        if (amount({ ...mod, value: 1 }, conds, state) > 0) part.fromStats.push(mod)
        continue
      }
      const value = amount(mod, conds, state)
      if (!value) continue
      if (isDmgKey(mod.stat)) part.dmg[mod.stat] += value
      else part.stats[mod.stat as StatKey] += value
    }
    setCache.set(cacheKey, part)
    return part
  }

  const vectors = new WeakMap<Artifact, StatBlock>()
  const vectorOf = (a: Artifact) => {
    let v = vectors.get(a)
    if (!v) vectors.set(a, (v = artifactVector(a)))
    return v
  }

  /** Scores a set of pieces (one per slot; null = empty slot). */
  function evaluate(pieces: (Artifact | null)[]): Evaluation {
    const part = setPart(pieces)
    const final = { ...bonus }
    for (const k of KEYS) final[k] += part.stats[k]
    for (const p of pieces)
      if (p) {
        const v = vectorOf(p)
        for (const k of KEYS) final[k] += v[k]
      }
    final.hp = base.hp * (1 + final.hp_) + final.hp
    final.atk = base.atk * (1 + final.atk_) + final.atk
    final.def = base.def * (1 + final.def_) + final.def

    const dmg = { ...fixedDmg }
    for (const k of Object.keys(dmg) as (keyof DmgBlock)[]) dmg[k] += part.dmg[k]
    for (const mod of part.fromStats) if (isDmgKey(mod.stat)) dmg[mod.stat] += mod.fromStats!(final)

    const parts = scoreParts(input.profile, final, dmg)
    return { ...parts, final, dmg, erOk: meetsER(input.profile, final) }
  }

  // --- Allocation-free scoring for the search loop (same maths as evaluate) ---
  const IDX = Object.fromEntries(KEYS.map((k, i) => [k, i])) as Record<StatKey, number>
  const bonusArr = Float64Array.from(KEYS.map((k) => bonus[k]))
  const arrays = new WeakMap<object, Float64Array>()
  const arrayOf = (block: StatBlock) => {
    let a = arrays.get(block)
    if (!a) arrays.set(block, (a = Float64Array.from(KEYS.map((k) => block[k]))))
    return a
  }
  const scratch = new Float64Array(KEYS.length)
  const { profile } = input
  const typeKey = (
    {
      normal: 'normal_dmg_',
      charged: 'charged_dmg_',
      skill: 'skill_dmg_',
      burst: 'burst_dmg_',
    } as const
  )[profile.damage.type]
  const elementIdx = IDX[`${profile.damage.element.toLowerCase()}_dmg_` as StatKey]
  const toBlock = () => Object.fromEntries(KEYS.map((k, i) => [k, scratch[i]])) as StatBlock

  /** Score and ER check only; used for the thousands of combinations. */
  function scoreOnly(pieces: (Artifact | null)[]): { score: number; erOk: boolean } {
    const part = setPart(pieces)
    scratch.set(bonusArr)
    const partArr = arrayOf(part.stats)
    for (let i = 0; i < scratch.length; i++) scratch[i] += partArr[i]
    for (const p of pieces)
      if (p) {
        const v = arrayOf(vectorOf(p))
        for (let i = 0; i < scratch.length; i++) scratch[i] += v[i]
      }
    scratch[IDX.hp] = base.hp * (1 + scratch[IDX.hp_]) + scratch[IDX.hp]
    scratch[IDX.atk] = base.atk * (1 + scratch[IDX.atk_]) + scratch[IDX.atk]
    scratch[IDX.def] = base.def * (1 + scratch[IDX.def_]) + scratch[IDX.def]

    let allDmg = fixedDmg.dmg_ + part.dmg.dmg_
    let typeDmg = fixedDmg[typeKey] + part.dmg[typeKey]
    let amplify = fixedDmg.amplify_dmg_ + part.dmg.amplify_dmg_
    if (part.fromStats.length) {
      const block = toBlock()
      for (const mod of part.fromStats) {
        const v = mod.fromStats!(block)
        if (mod.stat === 'dmg_') allDmg += v
        else if (mod.stat === typeKey) typeDmg += v
        else if (mod.stat === 'amplify_dmg_') amplify += v
      }
    }
    const scaling = scratch[IDX[profile.scaling]]
    const dmgBonus = 1 + scratch[elementIdx] + allDmg + typeDmg
    const cr = Math.min(Math.max(scratch[IDX.critRate_], 0), 1)
    const crit = 1 + cr * scratch[IDX.critDMG_]
    const reaction = reactionMultiplier(profile.reaction, scratch[IDX.eleMas], amplify)
    const erOk = !profile.minER || scratch[IDX.enerRech_] >= profile.minER - 1e-9
    return { score: scaling * dmgBonus * crit * reaction, erOk }
  }

  return { evaluate, scoreOnly, base }
}

export type Evaluator = ReturnType<typeof makeEvaluator>
export type SlotPieces = Partial<Record<ArtifactSlot, Artifact>>
