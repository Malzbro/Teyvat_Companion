// Weapon passives. For now only the always-on stat in a passive's first sentence is counted
// (e.g. Aqua Simulacra "HP is increased by 28%"); the rest is shown as text. Conditional
// passives get modelled once she's entered her weapons (her choice in Step 8).

import type { CharacterData, StatKey, WeaponData } from '../../data/types'
import { weaponPassiveText } from '../../data'
import type { ModStat, ModifierSet } from './types'
import { emptyModifierSet } from './types'

const STATS: Record<string, ModStat | 'element'> = {
  atk: 'atk_',
  hp: 'hp_',
  'max hp': 'hp_',
  def: 'def_',
  'crit rate': 'critRate_',
  'crit dmg': 'critDMG_',
  'elemental mastery': 'eleMas',
  'energy recharge': 'enerRech_',
  'healing bonus': 'heal_',
  'all dmg': 'dmg_',
  'elemental skill dmg': 'skill_dmg_',
  'elemental burst dmg': 'burst_dmg_',
  'elemental dmg bonus': 'element',
}

const PATTERNS = [/^(.+?) (?:is )?increased by \{0\}\.?$/i, /^Increases? (.+?) by \{0\}\.?$/i]

/** The always-on stat from the first sentence of a passive, if it is one. */
export function alwaysOnStat(weapon: WeaponData): { stat: ModStat | 'element'; index: 0 } | null {
  const first = weapon.passive?.template.split(/(?<=\.)\s+/)[0] ?? ''
  for (const re of PATTERNS) {
    const m = re.exec(first.trim())
    const stat = m && STATS[m[1].toLowerCase()]
    if (stat) return { stat, index: 0 }
  }
  return null
}

const elementDmg = (c: CharacterData) => `${c.element.toLowerCase()}_dmg_` as StatKey

export function weaponModifiers(
  weapon: { data: WeaponData; refinement: number } | undefined,
  character: CharacterData,
): ModifierSet {
  const out = emptyModifierSet()
  if (!weapon?.data.passive) return out
  const { data, refinement } = weapon
  const source = `${data.name} R${refinement}`
  const found = alwaysOnStat(data)
  const raw = data.passive!.refinements[refinement - 1]?.[0]
  if (found && raw) {
    const n = Number(raw.replace('%', ''))
    const value = raw.includes('%') ? n / 100 : n
    out.modifiers.push({
      id: `weapon-${data.key}`,
      source,
      stat: found.stat === 'element' ? elementDmg(character) : found.stat,
      value,
    })
  }
  out.notes.push({
    source: `${data.name} (${data.passive!.name})`,
    text: found
      ? `Counted: the always-on first effect. Rest not modelled yet: ${weaponPassiveText(data, refinement)}`
      : `Not modelled yet: ${weaponPassiveText(data, refinement)}`,
  })
  return out
}
