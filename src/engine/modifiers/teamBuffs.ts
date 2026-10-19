// Buffs a teammate gives the character on the field. Numbers come from genshin-db talent tables
// (src/data/generated/buffs.json), at the teammate's own talent level; nothing is typed in here.
// Only teammates whose buffs raise the damage of an Electro/any damage dealer are modelled:
// Bennett (ATK), Furina (DMG per Fanfare), Yelan (DMG ramp), Xilonen (RES shred). Everyone else
// contributes through resonance only; healing, shields and energy are not counted.

import { BUFF_DATA, atTalentLevel } from '../../data/buffs'
import { characterBaseStats, getCharacter, getWeapon, weaponStats } from '../../data'
import type { CharacterData, Element } from '../../data/types'
import type { OwnedCharacter, OwnedWeapon } from '../../db/types'
import { shownTalents } from '../talents'
import type { StatBlock } from '../stats'
import { REACTION_DATA } from '../../data/reactions'
import type { ModifierSet } from './types'
import { emptyModifierSet } from './types'

export type PartyMember = Pick<
  OwnedCharacter,
  'key' | 'level' | 'ascension' | 'constellation' | 'talents'
> & {
  weapon?: Pick<OwnedWeapon, 'key' | 'level' | 'ascension'>
  /** Their stats with their own gear (needed for buffs that scale on them, e.g. Candace's HP). */
  final?: StatBlock
  /** Pieces worn per artifact set (for team-buff sets like Noblesse or Viridescent Venerer). */
  sets?: Record<string, number>
}

/** Characters whose team buffs are counted. */
export const BUFFERS = ['bennett', 'furina', 'yelan', 'xilonen'] as const

/** Elements Xilonen's Source Samples can match (plus Geo, which is always active). */
const SAMPLE_ELEMENTS: Element[] = ['Pyro', 'Hydro', 'Cryo', 'Electro']

/** Passive 2 unlocks at the 4th ascension. */
const A4_ASCENSION = 4

export const BUFF_CONDITIONS = {
  bennett: 'buff-bennett',
  furina: 'buff-furina',
  yelan: 'buff-yelan',
  xilonen: 'buff-xilonen',
  faruzan: 'buff-faruzan',
  lynette: 'buff-lynette',
  candace: 'buff-candace',
  lisa: 'buff-lisa',
  noblesse: 'buff-noblesse',
  tenacity: 'buff-tenacity',
  moonsign: 'buff-moonsign',
} as const

/** Characters that raise the party's Moonsign by one level (their passive text says so). */
export const MOONSIGN_CHARACTERS = ['nefer', 'aino']

/** Moonsign level of a party: 0 none, 1 Nascent Gleam, 2+ Ascendant Gleam. */
export const moonsignLevel = (keys: string[]) =>
  keys.filter((k) => MOONSIGN_CHARACTERS.includes(k)).length

/** Pyro/Hydro/Electro/Cryo: the elements a Swirl can carry. */
export const SWIRLABLE: Element[] = ['Pyro', 'Hydro', 'Electro', 'Cryo']
const shredKey = (e: Element) => `${e.toLowerCase() as Lowercase<Element>}_res_shred_` as const

/**
 * Effects the teammates (not the focal character) give the focal character.
 * `focal` is who is being buffed; `party` is the other three.
 */
export function teamBuffModifiers(
  focal: CharacterData,
  party: PartyMember[],
  /** The focal character's own worn sets (their Viridescent Venerer/Deepwood shred the enemy too). */
  focalSets: Record<string, number> = {},
): ModifierSet {
  const out = emptyModifierSet()
  const members = party.filter((m) => m.key !== focal.key)
  step19Buffs(out, focal, members, focalSets)

  for (const m of members) {
    const data = getCharacter(m.key)
    if (!data) continue
    const talents = shownTalents(m.key, m.constellation, m.talents)

    if (m.key === 'bennett') {
      const own = characterBaseStats(data, m.level, m.ascension)
      const weaponData = m.weapon && getWeapon(m.weapon.key)
      const weaponAtk = weaponData
        ? weaponStats(weaponData, m.weapon!.level, m.weapon!.ascension).atk
        : 0
      const ratio = atTalentLevel(BUFF_DATA.bennett.burstAtkRatio, talents.burst)
      const source = 'Bennett: Fantastic Voyage'
      out.modifiers.push({
        id: 'bennett-atk',
        source,
        stat: 'atk',
        value: ratio * (own.atk + weaponAtk),
        condition: BUFF_CONDITIONS.bennett,
      })
      out.conditions.push({
        id: BUFF_CONDITIONS.bennett,
        source,
        label: `Bennett's field: ATK +${Math.round(ratio * 100)}% of his Base ATK (HP above 70%)`,
        kind: 'toggle',
        default: 1,
      })
    }

    if (m.key === 'furina') {
      const level = talents.burst
      const max = atTalentLevel(BUFF_DATA.furina.burstMaxFanfare, level)
      const per = atTalentLevel(BUFF_DATA.furina.burstDmgPerFanfare, level)
      const source = 'Furina: Let the People Rejoice'
      out.modifiers.push({
        id: 'furina-dmg',
        source,
        stat: 'dmg_',
        value: per,
        condition: BUFF_CONDITIONS.furina,
      })
      out.conditions.push({
        id: BUFF_CONDITIONS.furina,
        source,
        label: `Furina's Fanfare (DMG +${(per * 100).toFixed(2)}% each, up to ${max})`,
        kind: 'stacks',
        max,
        default: max,
      })
    }

    if (m.key === 'yelan' && m.ascension >= A4_ASCENSION) {
      const source = 'Yelan: Adapt With Ease'
      out.modifiers.push({
        id: 'yelan-dmg',
        source,
        stat: 'dmg_',
        value: BUFF_DATA.yelan.a4MaxDmg,
        condition: BUFF_CONDITIONS.yelan,
      })
      out.conditions.push({
        id: BUFF_CONDITIONS.yelan,
        source,
        label: `Yelan's Breakthrough ramp fully built: DMG +${Math.round(BUFF_DATA.yelan.a4MaxDmg * 100)}%`,
        kind: 'toggle',
        default: 1,
      })
    }

    if (m.key === 'xilonen') {
      const elements = new Set<Element>(['Geo'])
      for (const c of [focal, ...members.map((x) => getCharacter(x.key))])
        if (c && c.key !== 'xilonen' && SAMPLE_ELEMENTS.includes(c.element)) elements.add(c.element)
      // Source Samples only take on elements of the other party members; the focal's must be one.
      if (elements.has(focal.element)) {
        const shred = atTalentLevel(BUFF_DATA.xilonen.skillResShred, talents.skill)
        const source = 'Xilonen: Yohual’s Scratch'
        out.modifiers.push({
          id: 'xilonen-res',
          source,
          stat: 'enemy_res_shred_',
          value: shred,
          condition: BUFF_CONDITIONS.xilonen,
        })
        out.conditions.push({
          id: BUFF_CONDITIONS.xilonen,
          source,
          label: `Xilonen's ${focal.element} Source Sample active: ${focal.element} RES −${Math.round(shred * 100)}%`,
          kind: 'toggle',
          default: 1,
        })
      }
    }
  }
  return out
}

// --- Step 19 (approved 2026-10-19): numbers from buffs.json / reactions.json ---------------

function step19Buffs(
  out: ModifierSet,
  focal: CharacterData,
  members: PartyMember[],
  focalSets: Record<string, number>,
) {
  const D = BUFF_DATA
  const all = [focal, ...members.map((m) => getCharacter(m.key))].filter(
    (c): c is CharacterData => !!c,
  )
  const elements = new Set(all.map((c) => c.element))
  const toggle = (id: string, source: string, label: string) =>
    out.conditions.push({ id, source, label, kind: 'toggle', default: 1 })

  for (const m of members) {
    const data = getCharacter(m.key)
    if (!data) continue
    const talents = shownTalents(m.key, m.constellation, m.talents)

    if (m.key === 'faruzan') {
      const source = "Faruzan: The Wind's Secret Ways"
      const id = BUFF_CONDITIONS.faruzan
      const anemo = atTalentLevel(D.faruzan.burstAnemoDmg, talents.burst)
      const shred = atTalentLevel(D.faruzan.burstAnemoShred, talents.burst)
      out.modifiers.push(
        { id: 'faruzan-anemo', source, stat: 'anemo_dmg_', value: anemo, condition: id },
        { id: 'faruzan-shred', source, stat: 'anemo_res_shred_', value: shred, condition: id },
      )
      if (m.ascension >= A4_ASCENSION) {
        const own = characterBaseStats(data, m.level, m.ascension)
        const w = m.weapon && getWeapon(m.weapon.key)
        const baseAtk = own.atk + (w ? weaponStats(w, m.weapon!.level, m.weapon!.ascension).atk : 0)
        out.modifiers.push({
          id: 'faruzan-hurricane',
          source: 'Faruzan: Hurricane Guard',
          stat: 'anemo_flat_',
          value: D.faruzan.a4BaseAtk * baseAtk,
          condition: id,
        })
      }
      if (m.constellation >= 6)
        out.modifiers.push({
          id: 'faruzan-c6',
          source: 'Faruzan C6',
          stat: 'anemo_crit_dmg_',
          value: D.faruzan.c6AnemoCritDmg,
          condition: id,
        })
      toggle(id, source, `Faruzan's burst: Anemo DMG +${pct(anemo)}, Anemo RES −${pct(shred)}`)
    }

    if (m.key === 'lynette' && m.ascension >= 1) {
      const source = 'Lynette: Sophisticated Synergy'
      const value = D.lynette.a1Atk[Math.min(elements.size, 4) - 1]
      out.modifiers.push({
        id: 'lynette-atk',
        source,
        stat: 'atk_',
        value,
        condition: BUFF_CONDITIONS.lynette,
      })
      toggle(BUFF_CONDITIONS.lynette, source, `After Lynette's burst: ATK +${pct(value)}`)
    }

    if (m.key === 'candace') {
      const source = "Candace: Wagtail's Tide"
      const hp = m.final?.hp ?? 0
      const value =
        atTalentLevel(D.candace.burstNormalDmg, talents.burst) +
        (m.ascension >= A4_ASCENSION ? D.candace.a4PerThousandHp * (hp / 1000) : 0)
      out.modifiers.push({
        id: 'candace-normal',
        source,
        stat: 'normal_elemental_dmg_',
        value,
        condition: BUFF_CONDITIONS.candace,
      })
      toggle(
        BUFF_CONDITIONS.candace,
        source,
        `Candace's burst: Normal Attack Elemental DMG +${pct(value)}`,
      )
    }

    if (m.key === 'lisa' && m.ascension >= A4_ASCENSION) {
      const source = 'Lisa: Static Electricity Field'
      out.modifiers.push({
        id: 'lisa-def',
        source,
        stat: 'enemy_def_red_',
        value: D.lisa.a4DefShred,
        condition: BUFF_CONDITIONS.lisa,
      })
      toggle(
        BUFF_CONDITIONS.lisa,
        source,
        `Lightning Rose hit: enemy DEF −${pct(D.lisa.a4DefShred)}`,
      )
    }

    // Team-buff 4pc sets on a teammate (the focal's own are in sets.ts).
    const sets = m.sets ?? {}
    if ((sets.noblesseoblige ?? 0) >= 4 && (focalSets.noblesseoblige ?? 0) < 4)
      addOnce(
        out,
        'noblesse-atk',
        'Noblesse Oblige (teammate)',
        'atk_',
        D.sets.noblesse,
        BUFF_CONDITIONS.noblesse,
        `A teammate's Noblesse: ATK +${pct(D.sets.noblesse)}`,
      )
    if ((sets.tenacityofthemillelith ?? 0) >= 4 && (focalSets.tenacityofthemillelith ?? 0) < 4)
      addOnce(
        out,
        'tenacity-atk',
        'Tenacity of the Millelith (teammate)',
        'atk_',
        D.sets.tenacity,
        BUFF_CONDITIONS.tenacity,
        `A teammate's Tenacity: ATK +${pct(D.sets.tenacity)}`,
      )
  }

  // Stellar Swirl Base DMG from Vesna's and the Traveler's passives is a party buff, so it also
  // counts on the swirls the others trigger (the focal's own is added in rotations/damage.ts).
  if (elements.has('Cryo') && elements.has('Anemo'))
    for (const m of members) {
      const atk = m.final?.atk
      if (!atk) continue
      const p = m.key === 'vesna' ? D.vesna : m.key === 'travelercryo' ? D.travelercryo : undefined
      if (p)
        out.modifiers.push({
          id: `${m.key}-stellar-base`,
          source: `${getCharacter(m.key)?.name}: Stellar Swirl Base DMG`,
          stat: 'stellarswirl_baseDmg_',
          value: Math.min((atk / 100) * p.a0BaseDmgPer100Atk, p.a0BaseDmgMax),
        })
    }

  // Shred from sets worn by anyone in the party (the focal character included).
  const wearers = [
    { key: focal.key, sets: focalSets },
    ...members.map((m) => ({ key: m.key, sets: m.sets ?? {} })),
  ]
  const vv = wearers.some(
    (w) => getCharacter(w.key)?.element === 'Anemo' && (w.sets.viridescentvenerer ?? 0) >= 4,
  )
  if (vv) {
    const swirled = SWIRLABLE.filter((e) => all.some((c) => c.element === e))
    for (const e of swirled)
      out.modifiers.push({
        id: `vv-${e}`,
        source: 'Viridescent Venerer (Swirl)',
        stat: shredKey(e),
        value: D.sets.viridescent[2],
      })
  }
  if (
    wearers.some(
      (w) => getCharacter(w.key)?.element === 'Dendro' && (w.sets.deepwoodmemories ?? 0) >= 4,
    )
  )
    out.modifiers.push({
      id: 'deepwood',
      source: 'Deepwood Memories',
      stat: 'dendro_res_shred_',
      value: D.sets.deepwood,
    })

  // Moonsign (Ascendant Gleam): the best non-Moonsign member adds Lunar DMG from one stat.
  const keys = [focal.key, ...members.map((m) => m.key)]
  const level = moonsignLevel(keys)
  if (level >= 2) {
    const { cap, rates } = REACTION_DATA.moonsign
    const best = Math.max(
      0,
      ...members
        .filter((m) => !MOONSIGN_CHARACTERS.includes(m.key) && m.final)
        .map((m) => {
          const r = rates[getCharacter(m.key)!.element]
          return Math.min(cap, (m.final![r.stat as keyof StatBlock] / r.per) * r.value)
        }),
    )
    if (best > 0) {
      out.modifiers.push({
        id: 'moonsign-lunar',
        source: 'Moonsign: Ascendant Gleam',
        stat: 'lunar_dmg_',
        value: best,
        condition: BUFF_CONDITIONS.moonsign,
      })
      toggle(
        BUFF_CONDITIONS.moonsign,
        'Moonsign: Ascendant Gleam',
        `After a non-Moonsign teammate's skill or burst: Lunar DMG +${pct(best)}`,
      )
    }
    // Silken Moon's Serenade on anyone: party EM, and one Gleaming Moon effect.
    if (wearers.some((w) => (w.sets.silkenmoonsserenade ?? 0) >= 4)) {
      const [nascent, ascendant, perGleam] = D.sets.silkenMoon
      out.modifiers.push(
        {
          id: 'silken-em',
          source: "Silken Moon's Serenade",
          stat: 'eleMas',
          value: level >= 2 ? ascendant : nascent,
        },
        {
          id: 'silken-lunar',
          source: "Silken Moon's Serenade (Gleaming Moon)",
          stat: 'lunar_dmg_',
          value: perGleam / 100,
        },
      )
    }
  }
}

function addOnce(
  out: ModifierSet,
  id: string,
  source: string,
  stat: 'atk_',
  value: number,
  condition: string,
  label: string,
) {
  if (out.modifiers.some((m) => m.id === id)) return
  out.modifiers.push({ id, source, stat, value, condition })
  out.conditions.push({ id: condition, source, label, kind: 'toggle', default: 1 })
}

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`
