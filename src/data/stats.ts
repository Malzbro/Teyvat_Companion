// Display names and formatting for stats.

import type { StatKey } from './types'

export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  hp_: 'HP%',
  atk: 'ATK',
  atk_: 'ATK%',
  def: 'DEF',
  def_: 'DEF%',
  eleMas: 'Elemental Mastery',
  enerRech_: 'Energy Recharge',
  heal_: 'Healing Bonus',
  critRate_: 'CRIT Rate',
  critDMG_: 'CRIT DMG',
  physical_dmg_: 'Physical DMG',
  pyro_dmg_: 'Pyro DMG',
  hydro_dmg_: 'Hydro DMG',
  electro_dmg_: 'Electro DMG',
  cryo_dmg_: 'Cryo DMG',
  anemo_dmg_: 'Anemo DMG',
  geo_dmg_: 'Geo DMG',
  dendro_dmg_: 'Dendro DMG',
}

/** Compact labels for chips and tiles. */
export const STAT_SHORT: Record<StatKey, string> = {
  ...STAT_LABELS,
  eleMas: 'EM',
  enerRech_: 'ER',
  heal_: 'Healing',
  critRate_: 'Crit Rate',
  critDMG_: 'Crit DMG',
}

/** % stats end with an underscore and are stored as fractions (0.039 = 3.9%). */
export const isPercent = (key: StatKey) => key.endsWith('_')

/** Value as the game shows it: "3.9" for 3.9%, "209" for flat HP. */
export function toDisplay(key: StatKey, value: number): string {
  return isPercent(key) ? (value * 100).toFixed(1) : String(Math.round(value))
}

/** Parses what she typed ("3.9", "3,9", "3.9%") into a stored value, or null. */
export function fromDisplay(key: StatKey, text: string): number | null {
  const n = Number(text.replace('%', '').replace(',', '.').trim())
  if (!text.trim() || !Number.isFinite(n) || n < 0) return null
  return isPercent(key) ? Number((n / 100).toFixed(6)) : n
}

/** "3.9%" or "209". */
export function formatStat(key: StatKey, value: number): string {
  return isPercent(key) ? `${toDisplay(key, value)}%` : Math.round(value).toLocaleString()
}
