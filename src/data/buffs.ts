// Team-buff numbers read from genshin-db talent tables (npm run build:buff-data).

import buffsJson from './generated/buffs.json'

interface BuffData {
  source: string
  bennett: { burstAtkRatio: number[] }
  furina: { burstMaxFanfare: number[]; burstDmgPerFanfare: number[] }
  xilonen: { skillResShred: number[] }
  yelan: { a4MaxDmg: number }
}

export const BUFF_DATA = buffsJson as BuffData

/** Value at a talent level (1-based; 13+ from constellations is clamped to the table). */
export const atTalentLevel = (table: number[], level: number) =>
  table[Math.max(0, Math.min(level - 1, table.length - 1))]
