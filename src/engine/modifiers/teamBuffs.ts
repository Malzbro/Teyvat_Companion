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
import type { ModifierSet } from './types'
import { emptyModifierSet } from './types'

export type PartyMember = Pick<
  OwnedCharacter,
  'key' | 'level' | 'ascension' | 'constellation' | 'talents'
> & { weapon?: Pick<OwnedWeapon, 'key' | 'level' | 'ascension'> }

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
} as const

/**
 * Effects the teammates (not the focal character) give the focal character.
 * `focal` is who is being buffed; `party` is the other three.
 */
export function teamBuffModifiers(focal: CharacterData, party: PartyMember[]): ModifierSet {
  const out = emptyModifierSet()
  const members = party.filter((m) => m.key !== focal.key)

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
