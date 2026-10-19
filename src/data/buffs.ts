// Team-buff numbers read from genshin-db talent tables (npm run build:buff-data).

import buffsJson from './generated/buffs.json'

interface BuffData {
  source: string
  bennett: { burstAtkRatio: number[] }
  furina: { burstMaxFanfare: number[]; burstDmgPerFanfare: number[] }
  xilonen: { skillResShred: number[] }
  yelan: { a4MaxDmg: number }
  faruzan: {
    burstAnemoDmg: number[]
    burstAnemoShred: number[]
    a4BaseAtk: number
    c6AnemoCritDmg: number
  }
  lynette: { a1Atk: number[] }
  candace: { burstNormalDmg: number[]; a4PerThousandHp: number }
  lisa: { a4DefShred: number }
  clorinde: {
    a1AtkPerStack: number
    a1MaxStacks: number
    a1Cap: number
    a4CritRate: number
    a4MaxStacks: number
  }
  fischl: { a4AtkRatio: number }
  vesna: {
    a4AtkPerCryoAnemo: number
    a4EmPerOther: number
    a0BaseDmgPer100Atk: number
    a0BaseDmgMax: number
  }
  travelercryo: { a0BaseDmgPer100Atk: number; a0BaseDmgMax: number }
  nefer: {
    a1VeilEm: number
    a1MaxVeils: number
    a1PhantasmPerVeil: number
    a0BaseDmgPerEm: number
    a0BaseDmgMax: number
  }
  sets: {
    scarletproof: number[]
    viridescent: number[]
    deepwood: number
    noblesse: number
    tenacity: number
    thunderingFuryAggravate: number
    nightOfTheSky: number[]
    silkenMoon: number[]
  }
}

export const BUFF_DATA = buffsJson as BuffData

/** Value at a talent level (1-based; 13+ from constellations is clamped to the table). */
export const atTalentLevel = (table: number[], level: number) =>
  table[Math.max(0, Math.min(level - 1, table.length - 1))]
