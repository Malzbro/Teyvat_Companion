import { describe, expect, it } from 'vitest'
import { characterBaseStats, getCharacter, type ArtifactSlot, type StatKey } from '../../data'
import { BUFF_DATA } from '../../data/buffs'
import { newCharacter } from '../../db/roster'
import type { Artifact, OwnedCharacter } from '../../db/types'
import { amount } from '../modifiers'
import { teamBuffModifiers, type PartyMember } from '../modifiers/teamBuffs'
import { ENEMY_BASE_RES, resMultiplier, shredMultiplier } from '../profiles'
import { planTeam, suggestTeams, type RosterInput } from './suggest'

const member = (key: string, talents = { normal: 1, skill: 10, burst: 10 }): PartyMember => ({
  ...newCharacter(key),
  talents,
})
const buff = (focal: string, party: PartyMember[]) => teamBuffModifiers(getCharacter(focal)!, party)
const value = (focal: string, party: PartyMember[], id: string) => {
  const set = buff(focal, party)
  const mod = set.modifiers.find((m) => m.id === id)
  return mod && amount(mod, new Map(set.conditions.map((c) => [c.id, c])), {})
}

describe('team buffs (numbers from genshin-db)', () => {
  it('Bennett: ATK is his burst ratio × his Base ATK', () => {
    const own = characterBaseStats(getCharacter('bennett')!, 90, 6)
    // Fantastic Voyage at level 10 is 100.8% of Base ATK in game.
    expect(BUFF_DATA.bennett.burstAtkRatio[9]).toBeCloseTo(1.008)
    expect(value('clorinde', [member('bennett')], 'bennett-atk')).toBeCloseTo(1.008 * own.atk)
  })

  it('Bennett: the constellation that boosts his burst raises the level used (C5, not C3)', () => {
    const plain = value('clorinde', [member('bennett')], 'bennett-atk')!
    expect(value('clorinde', [{ ...member('bennett'), constellation: 3 }], 'bennett-atk')).toBe(
      plain,
    )
    expect(
      value('clorinde', [{ ...member('bennett'), constellation: 5 }], 'bennett-atk'),
    ).toBeGreaterThan(plain)
  })

  it('Furina: 0.25% DMG per Fanfare at level 10, up to 300 Fanfare', () => {
    expect(BUFF_DATA.furina.burstDmgPerFanfare[9]).toBeCloseTo(0.0025)
    expect(value('clorinde', [member('furina')], 'furina-dmg')).toBeCloseTo(0.0025 * 300)
  })

  it('Furina: fewer Fanfare gives less', () => {
    const set = buff('clorinde', [member('furina')])
    const conds = new Map(set.conditions.map((c) => [c.id, c]))
    const mod = set.modifiers[0]
    expect(amount(mod, conds, { 'buff-furina': 100 })).toBeCloseTo(0.25)
    expect(amount(mod, conds, { 'buff-furina': 0 })).toBe(0)
  })

  it('Yelan: only from her fourth ascension', () => {
    expect(value('clorinde', [member('yelan')], 'yelan-dmg')).toBeCloseTo(0.5)
    expect(value('clorinde', [{ ...member('yelan'), ascension: 3 }], 'yelan-dmg')).toBeUndefined()
  })

  it('Xilonen: shreds the focal character’s element only if a sample can match it', () => {
    expect(value('clorinde', [member('xilonen')], 'xilonen-res')).toBeCloseTo(0.36) // lv10 skill
    expect(value('navia', [member('xilonen')], 'xilonen-res')).toBeCloseTo(0.36) // Geo is always on
    expect(value('varka', [member('xilonen')], 'xilonen-res')).toBeUndefined() // Anemo has no sample
  })

  it('never buffs from the focal character itself', () => {
    expect(buff('bennett', [member('bennett')]).modifiers).toHaveLength(0)
  })
})

describe('RES shred', () => {
  it('uses the game’s RES curve', () => {
    expect(resMultiplier(0.1)).toBeCloseTo(0.9)
    expect(resMultiplier(-0.3)).toBeCloseTo(1.15)
    expect(shredMultiplier(0)).toBe(1)
    expect(shredMultiplier(0.4)).toBeCloseTo(1.15 / (1 - ENEMY_BASE_RES))
  })
})

// --- Ranking ------------------------------------------------------------------

let n = 0
const MAIN: Record<ArtifactSlot, StatKey> = {
  flower: 'hp',
  plume: 'atk',
  sands: 'atk_',
  goblet: 'electro_dmg_',
  circlet: 'critRate_',
}
const piece = (slot: ArtifactSlot, setKey = 'fragmentofharmonicwhimsy'): Artifact => ({
  id: `p${n++}`,
  slot,
  setKey,
  rarity: 5,
  level: 20,
  mainStat: MAIN[slot],
  substats: [
    { key: 'critRate_', value: 0.07 },
    { key: 'critDMG_', value: 0.14 },
  ],
})
const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

const roster = (keys: string[]): RosterInput => {
  const owned: OwnedCharacter[] = keys.map((k) => ({
    ...newCharacter(k),
    talents: { normal: 10, skill: 10, burst: 10 },
  }))
  return { owned, weapons: [], artifacts: SLOTS.map((s) => piece(s)), conditions: {} }
}

describe('suggestTeams', () => {
  const input = roster(['clorinde', 'bennett', 'furina', 'xilonen', 'qiqi', 'citlali', 'sandrone'])

  it('puts the damage buffers on the team ahead of those it can’t count', () => {
    const r = suggestTeams({ ...input, focalKey: 'clorinde', currentTeammates: [] })
    expect(r.checked).toBe(20) // C(6,3)
    const best = r.teams[0]
    expect(best.teammates).toEqual(expect.arrayContaining(['bennett', 'furina', 'xilonen']))
    expect(r.teams[0].score).toBeGreaterThan(r.teams[r.teams.length - 1].score)
    // Every buff is credited with a real, positive gain.
    expect(best.contributions.map((c) => c.key).sort()).toEqual(['bennett', 'furina', 'xilonen'])
    for (const c of best.contributions) expect(c.gain).toBeGreaterThan(0)
  })

  it('compares against her current team', () => {
    const r = suggestTeams({
      ...input,
      focalKey: 'clorinde',
      currentTeammates: ['qiqi', 'citlali', 'sandrone'],
    })
    expect(r.current).not.toBeNull()
    expect(r.teams[0].gain).toBeGreaterThan(0)
  })

  it('explains itself instead of returning nothing', () => {
    expect(
      suggestTeams({
        ...roster(['clorinde', 'bennett']),
        focalKey: 'clorinde',
        currentTeammates: [],
      }).message,
    ).toMatch(/at least three/)
    expect(suggestTeams({ ...input, focalKey: 'bennett', currentTeammates: [] }).message).toMatch(
      /support/,
    )
  })

  it('is quick enough for a full roster', () => {
    const big = roster([
      'clorinde',
      'sandrone',
      'odette',
      'qiqi',
      'yaemiko',
      'yelan',
      'furina',
      'navia',
      'skirk',
      'citlali',
      'xilonen',
      'xiangling',
      'bennett',
      'varka',
      'durin',
    ])
    const artifacts = Array.from({ length: 300 }, (_, i) => piece(SLOTS[i % 5]))
    const t = performance.now()
    const r = suggestTeams({ ...big, artifacts, focalKey: 'clorinde', currentTeammates: [] })
    expect(r.checked).toBe(364) // C(14,3)
    expect(performance.now() - t).toBeLessThan(15000)
  })
})

describe('planTeam', () => {
  it('keeps a teammate’s gear when it is already their best and untouched', () => {
    const base = roster(['clorinde', 'furina'])
    const hers = SLOTS.map((s) => piece(s, 'goldentroupe'))
    const furina = base.owned.find((c) => c.key === 'furina')!
    SLOTS.forEach((s, i) => (furina.artifactIds[s] = hers[i].id))
    const artifacts = [...base.artifacts, ...hers]
    const plan = planTeam({ ...base, artifacts, party: ['clorinde', 'furina'] })
    const f = plan.members.find((m) => m.key === 'furina')!
    expect(f.build?.swaps.length).toBe(0)
    expect(f.warning).toBeUndefined()
  })

  it('warns when the main character takes a teammate’s pieces and leaves them worse off', () => {
    const base = roster(['clorinde', 'xiangling'])
    // One shared pool of strong pieces that both want; Xiangling wears them now.
    const strong = SLOTS.map((s) => ({
      ...piece(s),
      substats: [
        { key: 'critRate_' as StatKey, value: 0.3 },
        { key: 'critDMG_' as StatKey, value: 0.6 },
      ],
    }))
    const xl = base.owned.find((c) => c.key === 'xiangling')!
    SLOTS.forEach((s, i) => (xl.artifactIds[s] = strong[i].id))
    const plan = planTeam({
      ...base,
      artifacts: [...base.artifacts, ...strong],
      party: ['clorinde', 'xiangling'],
    })
    const x = plan.members.find((m) => m.key === 'xiangling')!
    expect(x.score).toBeLessThan(x.currentScore)
    expect(x.warning).toMatch(/Clorinde/)
  })

  it('never gives the same artifact to two members', () => {
    const base = roster(['clorinde', 'bennett', 'furina', 'xilonen'])
    const artifacts = [...SLOTS, ...SLOTS, ...SLOTS, ...SLOTS].map((s) => piece(s))
    const plan = planTeam({
      ...base,
      artifacts,
      party: ['clorinde', 'furina', 'bennett', 'xilonen'],
    })
    const ids = plan.members.flatMap((m) => Object.values(m.build?.pieces ?? {}))
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
