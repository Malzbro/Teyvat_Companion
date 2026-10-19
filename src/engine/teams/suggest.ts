// Team suggester. Pure functions; the UI runs them in a Web Worker (../optimizer/worker.ts).
//
// "Best team for X" = the three teammates, out of the characters she owns, that make X's own
// best artifact build deal the most damage. Teammates' buffs are counted where they are modelled
// (modifiers/teamBuffs.ts) plus resonance and set/weapon effects; healing, shields and energy are
// not, so this ranks by X's damage, not by how comfortable the team is to play.
//
//  1. Find X's best build with no team (once).
//  2. Score every trio of her other characters on that build (cheap, a few hundred).
//  3. Re-run the full artifact search for the strongest few, since a buff can change the best gear.

import { getCharacter, getWeapon } from '../../data'
import type { CharacterData } from '../../data/types'
import type { Artifact, OwnedCharacter, OwnedWeapon } from '../../db/types'
import { ARTIFACT_SLOTS } from '../artifact'
import {
  amount,
  activeResonances,
  computeBuild,
  type ConditionState,
  type ModifierSet,
} from '../modifiers'
import { teamBuffModifiers, type PartyMember } from '../modifiers/teamBuffs'
import { optimize, type SuggestedBuild } from '../optimizer/optimize'
import { makeEvaluator } from '../optimizer/evaluator'
import { getProfile, isSupportProfile } from '../profiles'

export interface RosterInput {
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  artifacts: Artifact[]
  conditions: ConditionState
}

export interface SuggestInput extends RosterInput {
  focalKey: string
  /** Her current teammates for the focal character, to compare against. */
  currentTeammates: string[]
  /** How many teams to return. */
  limit?: number
}

export interface Contribution {
  /** Character who gives it. */
  key: string
  /** What it adds to the focal character's damage, in %. */
  gain: number
  /** e.g. "ATK +1,052" */
  text: string
}

export interface TeamSuggestion {
  teammates: string[]
  score: number
  /** % change vs her current team (null when she has no full team set). */
  gain: number | null
  resonances: string[]
  contributions: Contribution[]
}

export interface SuggestResult {
  teams: TeamSuggestion[]
  current: { teammates: string[]; score: number } | null
  /** Trios scored in the quick pass. */
  checked: number
  ms: number
  message?: string
}

const DEEP = 6

/** A teammate as the buff code needs them; with `artifacts`, also their stats and worn sets. */
export function memberOf(
  c: OwnedCharacter,
  weapons: OwnedWeapon[],
  artifacts?: Artifact[],
): PartyMember {
  const w = c.weaponId ? weapons.find((x) => x.id === c.weaponId) : undefined
  const member: PartyMember = {
    key: c.key,
    level: c.level,
    ascension: c.ascension,
    constellation: c.constellation,
    talents: c.talents,
    weapon: w ? { key: w.key, level: w.level, ascension: w.ascension } : undefined,
  }
  const data = getCharacter(c.key)
  if (!artifacts || !data) return member
  const worn = Object.values(c.artifactIds)
    .map((id) => artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => !!a)
  const wData = w && getWeapon(w.key)
  const build = computeBuild({
    character: data,
    level: c.level,
    ascension: c.ascension,
    weapon:
      w && wData
        ? { data: wData, level: w.level, ascension: w.ascension, refinement: w.refinement }
        : undefined,
    artifacts: worn,
    teammates: [],
  })
  return { ...member, final: build.stats.final, sets: build.stats.setCounts }
}

export const weaponOf = (c: OwnedCharacter, weapons: OwnedWeapon[]) => {
  const w = c.weaponId ? weapons.find((x) => x.id === c.weaponId) : undefined
  return w && getWeapon(w.key)
    ? { key: w.key, level: w.level, ascension: w.ascension, refinement: w.refinement }
    : undefined
}

/** Gear worn by characters who are locked (their pieces are never moved), except `except`. */
export function lockedFor(owned: OwnedCharacter[], except: string[]): string[] {
  return owned
    .filter((c) => c.locked && !except.includes(c.key))
    .flatMap((c) => Object.values(c.artifactIds))
    .filter((id): id is string => !!id)
}

/** The effects the other three give `focal`, as an extra for the optimizer. */
export function buffsFor(
  focal: OwnedCharacter,
  mates: string[],
  roster: Pick<RosterInput, 'owned' | 'weapons'> & { artifacts?: Artifact[] },
): ModifierSet {
  const data = getCharacter(focal.key) as CharacterData
  const party = mates
    .map((k) => roster.owned.find((c) => c.key === k))
    .filter((c): c is OwnedCharacter => !!c)
    .map((c) => memberOf(c, roster.weapons, roster.artifacts))
  const own = roster.artifacts ? memberOf(focal, roster.weapons, roster.artifacts).sets : undefined
  return teamBuffModifiers(data, party, own)
}

function trios<T>(list: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      for (let k = j + 1; k < list.length; k++) out.push([list[i], list[j], list[k]])
  return out
}

const resonanceNames = (focal: CharacterData, mates: string[]) =>
  activeResonances({
    character: focal,
    teammates: mates.map(getCharacter).filter((c): c is CharacterData => !!c),
    setCounts: {},
  }).map((r) => r.name)

/** "ATK +1,052", "DMG +75%", "Electro RES −42%" for each buff that is on. */
function describe(extra: ModifierSet, state: ConditionState, element: string) {
  const conds = new Map(extra.conditions.map((c) => [c.id, c]))
  const out = new Map<string, string[]>()
  for (const mod of extra.modifiers) {
    const v = amount(mod, conds, state)
    if (!v) continue
    const who = mod.source.split(':')[0].toLowerCase()
    const text =
      mod.stat === 'atk'
        ? `ATK +${Math.round(v).toLocaleString('en-GB')}`
        : mod.stat === 'dmg_'
          ? `DMG +${Math.round(v * 100)}%`
          : mod.stat === 'enemy_res_shred_'
            ? `${element} RES −${Math.round(v * 100)}%`
            : null
    if (text) out.set(who, [...(out.get(who) ?? []), text])
  }
  return out
}

export function suggestTeams(input: SuggestInput): SuggestResult {
  const started = performance.now()
  const { owned, weapons, artifacts, conditions } = input
  const focal = owned.find((c) => c.key === input.focalKey)
  const data = getCharacter(input.focalKey)
  const profile = getProfile(input.focalKey)
  const done = (r: Omit<SuggestResult, 'ms'>) => ({ ...r, ms: performance.now() - started })
  const none = (message: string) => done({ teams: [], current: null, checked: 0, message })
  if (!focal || !data || !profile) return none('That character isn’t in the roster.')

  const others = owned.filter((c) => c.key !== focal.key)
  if (others.length < 3) return none('Add at least three other characters to the roster first.')
  if (isSupportProfile(profile))
    return none(`${data.name} is built as a support, so there’s no damage to rank teams by.`)

  const lockedIds = lockedFor(owned, [focal.key])
  const base = {
    characterKey: focal.key,
    level: focal.level,
    ascension: focal.ascension,
    weapon: weaponOf(focal, weapons),
    conditions,
    artifacts,
    current: focal.artifactIds as Partial<Record<(typeof ARTIFACT_SLOTS)[number], string>>,
    lockedIds,
  }
  const evalTeam = (mates: string[]) => {
    const extra = buffsFor(focal, mates, input)
    return { extra, ev: makeEvaluator({ ...base, teammates: mates, extra, profile }) }
  }

  // 1. Her best build with nobody on the team.
  const solo = optimize({ ...base, teammates: [] }).builds[0]
  const soloPieces = ARTIFACT_SLOTS.map(
    (s) => artifacts.find((a) => a.id === solo?.pieces[s]) ?? null,
  )

  // 2. Every trio on that build.
  const quick = trios(others.map((c) => c.key))
    .map((mates) => ({ mates, score: evalTeam(mates).ev.evaluate(soloPieces).score }))
    .sort((a, b) => b.score - a.score)

  // 3. Full gear search for the strongest few (and for her current team, to compare fairly).
  const deep = (mates: string[]) => {
    const { extra, ev } = evalTeam(mates)
    const best = optimize({ ...base, teammates: mates, extra }).builds[0]
    const pieces = ARTIFACT_SLOTS.map(
      (s) => artifacts.find((a) => a.id === best?.pieces[s]) ?? null,
    )
    return { best, pieces, extra, ev, score: best?.score ?? ev.evaluate(pieces).score }
  }

  const haveCurrent =
    input.currentTeammates.length === 3 &&
    input.currentTeammates.every((k) => owned.some((c) => c.key === k))
  const currentScore = haveCurrent ? deep(input.currentTeammates).score : null

  const limit = input.limit ?? 5
  const teams = quick
    .slice(0, Math.max(DEEP, limit))
    .map(({ mates }) => {
      const d = deep(mates)
      const named = describe(d.extra, conditions, data.element)
      const contributions: Contribution[] = mates
        .filter((k) => named.has(k))
        .map((k) => {
          // How much less damage without this teammate's buffs, on the same gear.
          const without: ModifierSet = {
            ...d.extra,
            modifiers: d.extra.modifiers.filter(
              (m) => !m.source.toLowerCase().startsWith(getCharacter(k)!.name.toLowerCase()),
            ),
          }
          const solo = makeEvaluator({
            ...base,
            teammates: mates,
            extra: without,
            profile,
          }).evaluate(d.pieces).score
          return {
            key: k,
            gain: solo > 0 ? (d.score / solo - 1) * 100 : 0,
            text: named.get(k)!.join(', '),
          }
        })
      return {
        teammates: mates,
        score: d.score,
        gain: currentScore ? (d.score / currentScore - 1) * 100 : null,
        resonances: resonanceNames(data, mates),
        contributions,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return done({
    teams,
    current:
      currentScore !== null ? { teammates: input.currentTeammates, score: currentScore } : null,
    checked: quick.length,
  })
}

// --- Gear for a whole team ---------------------------------------------------

export interface MemberPlan {
  key: string
  /** Best build found from the gear left after earlier members picked (null if she owns no gear). */
  build: SuggestedBuild | null
  /** Score now vs with the suggested build. */
  currentScore: number
  score: number
  /** Set when sharing gear with earlier members leaves this one worse off than today. */
  warning?: string
}

export interface TeamPlan {
  members: MemberPlan[]
  ms: number
}

/**
 * Best artifacts for each member of a party with no piece used twice. The focal character
 * picks first, then the others in the order given, so the main damage dealer gets the best gear.
 */
export function planTeam(input: RosterInput & { party: string[] }): TeamPlan {
  const started = performance.now()
  const { owned, weapons, artifacts, conditions } = input
  const taken = new Set<string>()
  const members: MemberPlan[] = []

  for (const key of input.party) {
    const me = owned.find((c) => c.key === key)
    if (!me || !getProfile(key)) continue
    const mates = input.party.filter((k) => k !== key)
    const result = optimize({
      characterKey: key,
      level: me.level,
      ascension: me.ascension,
      weapon: weaponOf(me, weapons),
      teammates: mates,
      conditions,
      artifacts,
      current: me.artifactIds as Partial<Record<(typeof ARTIFACT_SLOTS)[number], string>>,
      lockedIds: [...lockedFor(owned, input.party), ...taken],
      extra: buffsFor(me, mates, input),
    })
    let build = result.builds[0] ?? null
    const wornNow = Object.values(me.artifactIds).filter((id): id is string => !!id)
    // Keep what she wears if it is at least as good and nobody earlier needs it.
    if (
      wornNow.length > 0 &&
      (!build || result.current.score >= build.score) &&
      !wornNow.some((id) => taken.has(id))
    )
      build = {
        pieces: Object.fromEntries(
          ARTIFACT_SLOTS.map((s) => [s, me.artifactIds[s]]).filter(([, id]) => id),
        ),
        score: result.current.score,
        gain: 0,
        reason: 'Already your best',
        swaps: [],
        meetsER: result.current.meetsER,
        final: result.current.final,
      }
    for (const id of Object.values(build?.pieces ?? {})) if (id) taken.add(id)
    const score = build?.score ?? result.current.score
    const first = input.party[0]
    members.push({
      key,
      build,
      currentScore: result.current.score,
      score,
      ...(key !== first && score < result.current.score * 0.95
        ? {
            warning: `Worse than what ${getCharacter(key)?.name} wears now: ${getCharacter(first)?.name} needs some of the same pieces.`,
          }
        : {}),
    })
  }
  return { members, ms: performance.now() - started }
}
