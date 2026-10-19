// Rotation damage (Steps 18–19). For each hit:
//   base   = Σ multiplier × stat (from the talent label: "ATK", "Max HP", "DEF", "Elemental Mastery")
//   direct = (base + Aggravate/Spread + flat bonuses) × (1 + DMG Bonus) × crit × DEF × RES × amp
// with expected (average) crit, an enemy at ENEMY_LEVEL with ENEMY_BASE_RES, and the same stats,
// set effects, resonance and team buffs the optimizer uses (makeEvaluator).
// Step 19 (formulas from Genshin Optimizer, approved 2026-10-19):
//   Stellar Swirl hits = mult × ATK × (1 + 6·EM/(EM+2000) + Stellar Swirl DMG) × (1 + base bonus)
//                        × crit × RES (no DMG% and no DEF)
//   Lunar-Bloom hits   = mult × EM × (1 + 6·EM/(EM+2000) + Lunar DMG) × (1 + base bonus) × crit × RES
//   Aggravate/Spread   = +1.15/1.25 × level multiplier × (1 + 5·EM/(EM+1200) + bonus) on the base
//   Swirl              = 0.6 × level multiplier × (1 + 16·EM/(EM+2000) + bonus) × RES (no crit)
//   Stellar Swirl      = 0.75 × level multiplier × (1 + 6·EM/(EM+2000) + bonus) × (1 + base) × crit × RES

import { getCharacter, type ArtifactSlot } from '../../data'
import { getTalentTable } from '../../data/talents'
import type { Element, StatKey, TalentKind } from '../../data/types'
import type { Artifact, TalentLevels } from '../../db/types'
import { ARTIFACT_SLOTS } from '../artifact'
import { type Condition, type ConditionState, type DmgBlock, type ModifierSet } from '../modifiers'
import { BUFF_DATA, atTalentLevel } from '../../data/buffs'
import { REACTION_DATA, levelMultiplier } from '../../data/reactions'
import { SWIRLABLE, moonsignLevel } from '../modifiers/teamBuffs'
import { makeEvaluator } from '../optimizer/evaluator'
import {
  ENEMY_BASE_RES,
  getProfile,
  reactionMultiplier,
  resMultiplier,
  type Profile,
} from '../profiles'
import type { StatBlock } from '../stats'
import { shownTalents } from '../talents'
import { CYCLE_SECONDS, ROTATIONS } from './table'
import type { Hit, HitType } from './types'

/** Enemy level for DEF (approved in Step 18). */
export const ENEMY_LEVEL = 100

/** Vesna's Rite of Spring's Procession: Spirit Blades +10% per Disciplinary Action stack. */
const VESNA_STACK_BONUS = 0.1
const A1_ASCENSION = 1

type Term = { param: string; stat: StatKey | null }

const STAT_WORDS: [RegExp, StatKey][] = [
  [/^max hp/i, 'hp'],
  [/^def/i, 'def'],
  [/^elemental mastery/i, 'eleMas'],
  [/^atk/i, 'atk'],
]

/**
 * A label's alternatives, each a sum of terms with a hit count:
 * "{p1:P} ATK+{p2:P} Elemental Mastery" → [{terms: [p1·ATK, p2·EM], times: 1}]
 * "{p4:P}/{p5:P}/{p7:P}×3" → three alternatives, the last hitting 3 times.
 */
export function parseLabel(template: string): { terms: Term[]; times: number }[] {
  return template.split('/').map((alt) => {
    const times = Number(/[×x*]\s*(\d+)\s*$/.exec(alt)?.[1] ?? 1)
    const terms: Term[] = []
    const re = /\{(param\d+):([A-Z0-9]*)\}\s*([A-Za-z ]*)/g
    for (const m of alt.matchAll(re)) {
      const word = m[3].trim()
      const stat = STAT_WORDS.find(([w]) => w.test(word))?.[1]
      // A percentage with no stat word scales on ATK; a plain number is flat damage.
      terms.push({ param: m[1], stat: stat ?? (m[2].includes('P') ? 'atk' : null) })
    }
    return { terms, times }
  })
}

const TYPE_DMG: Record<HitType, keyof DmgBlock | null> = {
  normal: 'normal_dmg_',
  charged: 'charged_dmg_',
  plunge: 'plunge_dmg_',
  skill: 'skill_dmg_',
  burst: 'burst_dmg_',
  other: null,
}

/** Share of a character's Electro hits that Aggravate in a Quicken team (approved, in %). */
export const AGGRAVATE_SHARE: Record<string, number> = { clorinde: 50, fischl: 60, lisa: 33 }
/** Reactions per 20 s cycle (approved). */
export const STELLAR_SWIRLS = 6
/**
 * Calibrated from your Miliastra Wonderland test (2026-10-19, level 100 dummy, Vesna · Faruzan ·
 * Qiqi · Traveler, 3 rotations in 60 s): Stellar Swirls per 20 s cycle by who triggers them
 * (Vesna 26 and Faruzan 13 in the run), and the damage of one Stellar Swirl as a multiple of the
 * level multiplier. Game data has no number for the vortex hits a Stellar Swirl leaves, so this
 * replaces GO's 0.75 with the value (6.22) that reproduces Faruzan's total (she deals almost nothing else);
 * with it, Vesna's total is predicted independently. See CLAUDE.md, "Stellar Swirl calibration".
 */
export const STELLAR_SWIRLS_BY: Record<string, number> = { vesna: 9, faruzan: 4 }
export const STELLAR_SWIRL_MULT = 6.22
export const SWIRLS = 4
export const FISCHL_A4_HITS = 6

const A4_ASCENSION = 4

export interface RotationInput {
  characterKey: string
  level: number
  ascension: number
  constellation: number
  talents: TalentLevels
  weapon?: { key: string; level: number; ascension: number; refinement: number }
  teammates: string[]
  conditions: ConditionState
  /** Worn artifacts by slot. */
  pieces: Partial<Record<ArtifactSlot, Artifact>>
  /** Teammates' buffs (modifiers/teamBuffs). */
  extra?: ModifierSet
}

export interface HitResult {
  name: string
  count: number
  /** Average damage of one hit (all instances of a "×N" label). */
  each: number
  total: number
  /** "Stellar Swirl", "Lunar-Bloom", "Aggravate" … when the hit is (partly) reaction damage. */
  reaction?: string
}

export interface RotationResult {
  key: string
  hits: HitResult[]
  /** Damage per cycle. */
  total: number
  dps: number
  note?: string
  /** Toggles and counts that change this number (team buffs, reaction shares, stacks). */
  conditions: (Condition & { value: number })[]
}

/** What the party can do, from its elements. */
export interface Team {
  keys: string[]
  elements: Set<Element>
  /** Dendro + Electro. */
  quicken: boolean
  /** Cryo + Anemo: Cryo Swirls become Stellar Swirls, giving Radiance: Stellar Swirl. */
  radiance: boolean
  /** Electro plus anything it reacts with. */
  electroReaction: boolean
  moonsign: number
}

export function teamOf(keys: string[]): Team {
  const elements = new Set(
    keys.map((k) => getCharacter(k)?.element).filter((e): e is Element => !!e),
  )
  const has = (e: Element) => elements.has(e)
  return {
    keys,
    elements,
    quicken: has('Dendro') && has('Electro'),
    radiance: has('Cryo') && has('Anemo'),
    electroReaction:
      has('Electro') && (['Dendro', 'Hydro', 'Pyro', 'Cryo', 'Anemo'] as Element[]).some(has),
    moonsign: moonsignLevel(keys),
  }
}

/** The one Anemo member whose rotation carries the team's Swirls (an Anemo damage dealer first). */
export function swirlerOf(team: Team): string | undefined {
  const anemo = team.keys.filter((k) => getCharacter(k)?.element === 'Anemo')
  return anemo.find((k) => getProfile(k)?.role === 'dps') ?? anemo[0]
}

interface Ctx {
  characterKey: string
  level: number
  ascension: number
  talentLevel: (kind: TalentKind) => number
  final: StatBlock
  dmg: DmgBlock
  profile: Profile
  element: Element
  // Step 19
  radiance: boolean
  /** Fraction of this character's Electro (Aggravate) / Dendro (Spread) hits that react. */
  aggravate: number
  spread: number
  /** Flat DMG on Electro Normal Attacks and Bursts (Clorinde's Dark-Shattering Flame). */
  electroNaBurstFlat: number
  /** Phantasm Performance multiplier from Veils (1 = none). */
  phantasm: number
  /** CRIT Rate on Lunar hits only (Night of the Sky's Unveiling). */
  lunarCritRate: number
}

const emFactor = (em: number, k: number, d: number) => (k * em) / (em + d)

function talentValue(characterKey: string, kind: TalentKind, label: string) {
  const table = getTalentTable(characterKey, kind)
  const row = table?.labels.find((l) => l.split('|')[0] === label)
  if (!table || !row) throw new Error(`No "${label}" in ${characterKey}'s ${kind}`)
  return { table, row }
}

const resFor = (dmg: DmgBlock, element: Element | 'Physical', profile: Profile) => {
  const own = element === profile.damage.element ? dmg.enemy_res_shred_ : 0
  const key = `${element.toLowerCase()}_res_shred_` as keyof DmgBlock
  const shred = own + (element === 'Physical' ? 0 : (dmg[key] ?? 0))
  return resMultiplier(ENEMY_BASE_RES - shred)
}

const critOf = (stats: StatBlock, extraRate = 0, extraDmg = 0) =>
  1 + Math.min(Math.max(stats.critRate_ + extraRate, 0), 1) * (stats.critDMG_ + extraDmg)

/** Average damage of one hit, given final stats and damage bonuses. */
export function hitDamage(hit: Hit, ctx: Ctx): { each: number; reaction?: string } {
  const stellar = ctx.radiance && !!hit.stellarLabel
  const label = stellar ? hit.stellarLabel! : hit.label
  const { table, row } = talentValue(ctx.characterKey, hit.talent, label)
  const level = ctx.talentLevel(hit.talent)
  const at = (param: string, t = table) => {
    const v = t.params[param]
    if (!v) throw new Error(`${ctx.characterKey} ${label}: no ${param}`)
    return v[Math.max(0, Math.min(level - 1, v.length - 1))]
  }

  const stats = { ...ctx.final }
  if (hit.noelleBurstAtk) {
    const burst = getTalentTable(ctx.characterKey, 'burst')!
    const atkRow = burst.labels.find((l) => l.startsWith('ATK Bonus|'))!
    const p = /\{(param\d+)/.exec(atkRow)![1]
    const v = burst.params[p]
    stats.atk += v[Math.min(ctx.talentLevel('burst') - 1, v.length - 1)] * ctx.final.def
  }

  const alts = parseLabel(row.split('|')[1] ?? '')
  const alt = alts[Math.min(hit.pick ?? 0, alts.length - 1)]
  const addMult = (() => {
    if (!hit.addMult) return 0
    const l = stellar && hit.addMult.stellarLabel ? hit.addMult.stellarLabel : hit.addMult.label
    const x = talentValue(ctx.characterKey, hit.talent, l)
    const p = /\{(param\d+)/.exec(x.row)![1]
    return hit.addMult.times * at(p, x.table)
  })()
  let base = 0
  for (const [i, t] of alt.terms.entries())
    base += (at(t.param) + (i === 0 ? addMult : 0)) * (t.stat ? stats[t.stat] : 1)
  let special = 1
  if (hit.vesnaStacks && ctx.ascension >= A1_ASCENSION)
    special *= 1 + VESNA_STACK_BONUS * hit.vesnaStacks
  if (hit.phantasm) special *= ctx.phantasm
  const times = alt.times
  const element = hit.element ?? ctx.element

  // Stellar Swirl / Lunar-Bloom talent hits: reaction DMG, no DMG% and no DEF.
  if (stellar || hit.lunar) {
    const em = stats.eleMas
    if (stellar) {
      const resist = hit.stellarResist ?? ctx.element
      const each =
        base *
        special *
        (1 + emFactor(em, 6, 2000) + ctx.dmg.stellarswirl_dmg_) *
        (1 + ctx.dmg.stellarswirl_baseDmg_) *
        critOf(stats, 0, resist === 'Anemo' ? ctx.dmg.anemo_crit_dmg_ : 0) *
        resFor(ctx.dmg, resist, ctx.profile)
      return { each: each * times, reaction: 'Stellar Swirl' }
    }
    const each =
      base *
      special *
      (1 + emFactor(em, 6, 2000) + ctx.dmg.lunar_dmg_) *
      (1 + ctx.dmg.lunarbloom_baseDmg_) *
      critOf(stats, ctx.lunarCritRate) *
      resFor(ctx.dmg, 'Dendro', ctx.profile)
    return { each: each * times, reaction: 'Lunar-Bloom' }
  }

  // Direct hits: additive reactions and flat bonuses join the base per instance.
  const lv = levelMultiplier(ctx.level)
  let add = 0
  let reaction: string | undefined
  if (element === 'Electro' && ctx.aggravate > 0) {
    add +=
      ctx.aggravate *
      REACTION_DATA.additive.aggravate *
      lv *
      (1 + emFactor(stats.eleMas, 5, 1200) + ctx.dmg.aggravate_dmg_)
    reaction = 'Aggravate'
  }
  if (element === 'Dendro' && ctx.spread > 0) {
    add +=
      ctx.spread *
      REACTION_DATA.additive.spread *
      lv *
      (1 + emFactor(stats.eleMas, 5, 1200) + ctx.dmg.spread_dmg_)
    reaction = 'Spread'
  }
  if (element === 'Electro' && (hit.type === 'normal' || hit.type === 'burst'))
    add += ctx.electroNaBurstFlat
  if (element === 'Anemo' && hit.type !== 'other') add += ctx.dmg.anemo_flat_

  const elementKey = `${element.toLowerCase()}_dmg_` as StatKey
  const typeKey = TYPE_DMG[hit.type]
  const dmgBonus =
    1 +
    stats[elementKey] +
    ctx.dmg.dmg_ +
    (typeKey ? ctx.dmg[typeKey] : 0) +
    (hit.type === 'normal' && element !== 'Physical' ? ctx.dmg.normal_elemental_dmg_ : 0)
  const crit = critOf(stats, 0, element === 'Anemo' ? ctx.dmg.anemo_crit_dmg_ : 0)
  const defMult =
    (ctx.level + 100) /
    (ctx.level + 100 + (ENEMY_LEVEL + 100) * (1 - Math.min(ctx.dmg.enemy_def_red_, 0.9)))
  const amp =
    element === ctx.profile.damage.element
      ? reactionMultiplier(ctx.profile.reaction, stats.eleMas, ctx.dmg.amplify_dmg_)
      : 1
  const each =
    (base * special + add) *
    times *
    dmgBonus *
    crit *
    defMult *
    resFor(ctx.dmg, element, ctx.profile) *
    amp
  return { each, reaction }
}

/** Damage and DPS of a character's approved rotation, or null if they don't have one. */
export function rotationDamage(input: RotationInput): RotationResult | null {
  const rotation = ROTATIONS[input.characterKey]
  const profile = getProfile(input.characterKey)
  const data = getCharacter(input.characterKey)
  if (!rotation || !profile || !data) return null

  const team = teamOf([input.characterKey, ...input.teammates])
  const D = BUFF_DATA
  const key = input.characterKey
  const pieces = ARTIFACT_SLOTS.map((s) => input.pieces[s] ?? null)
  const sets: Record<string, number> = {}
  for (const p of pieces) if (p) sets[p.setKey] = (sets[p.setKey] ?? 0) + 1
  const wears = (set: string) => (sets[set] ?? 0) >= 4

  // Conditions this character's own rotation adds (reaction shares, passives' stacks).
  const own: Condition[] = []
  const stacks = (id: string, source: string, label: string, max: number, def: number) => {
    own.push({ id, source, label, kind: 'stacks', max, default: def })
    return Math.min(input.conditions[id] ?? def, max)
  }
  const aggravate =
    team.quicken && data.element === 'Electro'
      ? stacks(
          'react-aggravate',
          'Aggravate',
          'Share of Electro hits that Aggravate (%)',
          100,
          AGGRAVATE_SHARE[key] ?? 0,
        ) / 100
      : 0
  const spread =
    team.quicken && data.element === 'Dendro'
      ? stacks('react-spread', 'Spread', 'Share of Dendro hits that Spread (%)', 100, 0) / 100
      : 0

  const ev = makeEvaluator({
    characterKey: key,
    level: input.level,
    ascension: input.ascension,
    weapon: input.weapon,
    teammates: input.teammates,
    conditions: input.conditions,
    profile,
    extra: input.extra,
  })
  const evaluated = ev.evaluate(pieces)
  const final = { ...evaluated.final }
  const dmg = { ...evaluated.dmg }
  const asc4 = input.ascension >= A4_ASCENSION

  // --- Own kit and set effects (Step 19) ---
  // Faruzan's burst buffs the whole party, herself included (teamBuffs only covers teammates).
  if (key === 'faruzan') {
    const shownNow = shownTalents(key, input.constellation, input.talents)
    const id = 'buff-faruzan'
    const on = (input.conditions[id] ?? 1) > 0
    own.push({
      id,
      source: "Faruzan: The Wind's Secret Ways",
      label: 'Her own burst buffs her too',
      kind: 'toggle',
      default: 1,
    })
    if (on) {
      final.anemo_dmg_ += atTalentLevel(D.faruzan.burstAnemoDmg, shownNow.burst)
      dmg.anemo_res_shred_ += atTalentLevel(D.faruzan.burstAnemoShred, shownNow.burst)
      if (input.ascension >= A4_ASCENSION) dmg.anemo_flat_ += D.faruzan.a4BaseAtk * ev.base.atk
      if (input.constellation >= 6) dmg.anemo_crit_dmg_ += D.faruzan.c6AnemoCritDmg
    }
  }
  let electroNaBurstFlat = 0
  if (key === 'clorinde') {
    if (team.electroReaction && input.ascension >= A1_ASCENSION) {
      const n = stacks(
        'clorinde-a1',
        'Clorinde: Dark-Shattering Flame',
        'Stacks after Electro reactions',
        D.clorinde.a1MaxStacks,
        D.clorinde.a1MaxStacks,
      )
      electroNaBurstFlat = Math.min(D.clorinde.a1AtkPerStack * final.atk * n, D.clorinde.a1Cap)
    }
    if (asc4) {
      const n = stacks(
        'clorinde-a4',
        'Clorinde: Lawful Remuneration',
        'CRIT Rate stacks (Bond of Life ≥ 100%)',
        D.clorinde.a4MaxStacks,
        D.clorinde.a4MaxStacks,
      )
      final.critRate_ += D.clorinde.a4CritRate * n
    }
  }
  if (team.radiance) {
    // Vesna's Truth Prevails and the base-DMG passives of whoever has one on the team.
    if (key === 'vesna' && asc4) {
      const elems = team.keys.map((k) => getCharacter(k)!.element)
      const cryoAnemo = elems.filter((e) => e === 'Cryo' || e === 'Anemo').length
      final.atk += ev.base.atk * D.vesna.a4AtkPerCryoAnemo * cryoAnemo
      final.eleMas += D.vesna.a4EmPerOther * (elems.length - cryoAnemo)
    }
    if (key === 'vesna')
      dmg.stellarswirl_baseDmg_ += Math.min(
        (final.atk / 100) * D.vesna.a0BaseDmgPer100Atk,
        D.vesna.a0BaseDmgMax,
      )
    if (key === 'travelercryo')
      dmg.stellarswirl_baseDmg_ += Math.min(
        (final.atk / 100) * D.travelercryo.a0BaseDmgPer100Atk,
        D.travelercryo.a0BaseDmgMax,
      )
    if (wears('scarletproof')) {
      final.critRate_ += D.sets.scarletproof[0]
      dmg.stellarswirl_dmg_ += D.sets.scarletproof[1]
    }
  }
  if (wears('viridescentvenerer')) {
    dmg.swirl_dmg_ += D.sets.viridescent[0]
    dmg.stellarswirl_dmg_ += D.sets.viridescent[1]
  }
  if (wears('thunderingfury')) dmg.aggravate_dmg_ += D.sets.thunderingFuryAggravate
  let phantasm = 1
  let lunarCritRate = 0
  if (key === 'nefer') {
    dmg.lunarbloom_baseDmg_ += Math.min(final.eleMas * D.nefer.a0BaseDmgPerEm, D.nefer.a0BaseDmgMax)
    if (team.moonsign >= 2 && input.ascension >= A1_ASCENSION) {
      const veils = stacks(
        'nefer-veils',
        'Nefer: A Wager of Moonlight',
        'Veils of Falsehood',
        D.nefer.a1MaxVeils,
        D.nefer.a1MaxVeils,
      )
      phantasm = 1 + D.nefer.a1PhantasmPerVeil * veils
      if (veils >= D.nefer.a1MaxVeils) final.eleMas += D.nefer.a1VeilEm
      const per = talentValue('nefer', 'burst', 'DMG Bonus')
      const p = /\{(param\d+)/.exec(per.row)![1]
      const v = per.table.params[p]
      dmg.burst_dmg_ +=
        veils *
        v[Math.min(shownTalents(key, input.constellation, input.talents).burst - 1, v.length - 1)]
    }
  }
  if (wears('nightoftheskysunveiling') && team.moonsign >= 1) {
    const [nascent, ascendant, perGleam] = D.sets.nightOfTheSky
    lunarCritRate = team.moonsign >= 2 ? ascendant : nascent
    dmg.lunar_dmg_ += perGleam
  }

  const shown = shownTalents(key, input.constellation, input.talents)
  const ctx: Ctx = {
    characterKey: key,
    level: input.level,
    ascension: input.ascension,
    talentLevel: (k: TalentKind) => shown[k],
    final,
    dmg,
    profile,
    element: data.element,
    radiance: team.radiance,
    aggravate,
    spread,
    electroNaBurstFlat,
    phantasm,
    lunarCritRate,
  }

  const hits: HitResult[] = rotation.hits.map((hit) => {
    const { each, reaction } = hitDamage(hit, ctx)
    return {
      name: hit.name ?? hit.label.replace(/ DMG(?= \(|$)/, ''),
      count: hit.count,
      each,
      total: each * hit.count,
      reaction,
    }
  })

  // Fischl's Undone Be Thy Sinful Hex: Thundering Retribution on Electro reactions.
  if (key === 'fischl' && asc4 && team.electroReaction) {
    const n = stacks(
      'fischl-a4',
      'Fischl: Undone Be Thy Sinful Hex',
      'Thundering Retribution strikes',
      20,
      FISCHL_A4_HITS,
    )
    const each =
      D.fischl.a4AtkRatio *
      final.atk *
      (1 + final.electro_dmg_ + dmg.dmg_) *
      critOf(final) *
      ((input.level + 100) /
        (input.level + 100 + (ENEMY_LEVEL + 100) * (1 - Math.min(dmg.enemy_def_red_, 0.9)))) *
      resFor(dmg, 'Electro', profile)
    if (n > 0) hits.push({ name: 'Thundering Retribution', count: n, each, total: each * n })
  }

  // Swirls: each Anemo character with a calibrated count carries their own Stellar Swirls;
  // otherwise the team's main Anemo character carries them all.
  const calibrated = team.keys.some((k) => STELLAR_SWIRLS_BY[k] !== undefined)
  const swirlsHere = calibrated ? STELLAR_SWIRLS_BY[key] !== undefined : swirlerOf(team) === key
  if (team.radiance && swirlsHere) {
    const em = final.eleMas
    const lv = levelMultiplier(input.level)
    const n = stacks(
      'react-stellar-swirls',
      'Stellar Swirl',
      `Stellar Swirls ${getCharacter(key)?.name ?? key} triggers`,
      30,
      STELLAR_SWIRLS_BY[key] ?? STELLAR_SWIRLS,
    )
    const each =
      STELLAR_SWIRL_MULT *
      lv *
      (1 + emFactor(em, 6, 2000) + dmg.stellarswirl_dmg_) *
      (1 + dmg.stellarswirl_baseDmg_) *
      critOf(final, 0, dmg.anemo_crit_dmg_) *
      resFor(dmg, 'Anemo', profile)
    if (n > 0)
      hits.push({
        name: 'Stellar Swirl (reaction + vortex)',
        count: n,
        each,
        total: each * n,
        reaction: 'Stellar Swirl',
      })
  }
  if (swirlerOf(team) === key && !team.radiance) {
    const em = final.eleMas
    const lv = levelMultiplier(input.level)
    const swirled = SWIRLABLE.find((e) => team.elements.has(e))
    if (swirled) {
      const n = stacks('react-swirls', 'Swirl', `${swirled} Swirl reactions`, 20, SWIRLS)
      const each =
        REACTION_DATA.transformative.swirl *
        lv *
        (1 + emFactor(em, 16, 2000) + dmg.swirl_dmg_) *
        resFor(dmg, swirled, profile)
      if (n > 0)
        hits.push({
          name: `${swirled} Swirl`,
          count: n,
          each,
          total: each * n,
          reaction: 'Swirl',
        })
    }
  }

  const total = hits.reduce((s, h) => s + h.total, 0)
  const extraConds = input.extra?.conditions ?? []
  const conditions = [
    ...extraConds.filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i),
    ...own,
  ].map((c) => ({ ...c, value: input.conditions[c.id] ?? c.default }))
  return {
    key: rotation.key,
    hits,
    total,
    dps: total / CYCLE_SECONDS,
    note: rotation.note,
    conditions,
  }
}
