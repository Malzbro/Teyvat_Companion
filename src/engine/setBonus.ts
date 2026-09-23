// Always-on 2-piece bonuses that show on the stat screen, read from the set's 2pc text.
// Damage-type bonuses (Skill/Burst DMG…), shields and RES aren't stat-screen stats; Step 8 handles those.

import { artifactSets } from '../data'
import type { StatKey } from '../data/types'

const ELEMENTS: Record<string, StatKey> = {
  pyro: 'pyro_dmg_',
  hydro: 'hydro_dmg_',
  electro: 'electro_dmg_',
  cryo: 'cryo_dmg_',
  anemo: 'anemo_dmg_',
  geo: 'geo_dmg_',
  dendro: 'dendro_dmg_',
  physical: 'physical_dmg_',
}

const NAMED: [RegExp, StatKey][] = [
  [/^ATK$/i, 'atk_'],
  [/^HP$/i, 'hp_'],
  [/^DEF$/i, 'def_'],
  [/^Energy Recharge$/i, 'enerRech_'],
  [/^CRIT Rate$/i, 'critRate_'],
  [/^(Character )?Healing (Bonus|Effectiveness)$/i, 'heal_'],
]

function keyFor(name: string): StatKey | null {
  const trimmed = name.trim()
  const element = /^(\w+) DMG( Bonus)?$/i.exec(trimmed)
  if (element && ELEMENTS[element[1].toLowerCase()]) return ELEMENTS[element[1].toLowerCase()]
  return NAMED.find(([re]) => re.test(trimmed))?.[1] ?? null
}

/** Parses a 2pc text like "ATK +18%." into { atk_: 0.18 }, or null if it's not a plain stat. */
export function parseTwoPiece(text: string): { key: StatKey; value: number } | null {
  const t = text.trim().replace(/\.$/, '')
  const pct = (n: string) => Number(n) / 100

  let m = /^Increases Elemental Mastery by (\d+)$/i.exec(t)
  if (m) return { key: 'eleMas', value: Number(m[1]) }
  m = /^Gain a ([\d.]+)% (.+)$/i.exec(t)
  if (m && keyFor(m[2])) return { key: keyFor(m[2])!, value: pct(m[1]) }
  m = /^(.+?) (?:is increased by|\+) ?([\d.]+)%$/i.exec(t)
  if (m && keyFor(m[1])) return { key: keyFor(m[1])!, value: pct(m[2]) }
  return null
}

/** Set key → its always-on 2pc stat, for sets that have one. */
export const TWO_PIECE_STATS: Record<string, { key: StatKey; value: number }> = {}
for (const s of artifactSets) {
  const bonus = parseTwoPiece(s.twoPiece)
  if (bonus) TWO_PIECE_STATS[s.key] = bonus
}
