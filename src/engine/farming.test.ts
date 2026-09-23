import { describe, expect, it } from 'vitest'
import type { Goal } from '../db/types'
import { bossNeeds, domainsToday, drops, families, resinEstimate, serverWeekday } from './farming'
import { goalNeeds } from './materials'

// 23 Sep 2026 is a Wednesday.
describe('server weekday', () => {
  it('Europe changes day at 04:00 UTC+1', () => {
    expect(serverWeekday(new Date('2026-09-23T02:59:00Z'), 'Europe')).toBe('Tuesday')
    expect(serverWeekday(new Date('2026-09-23T03:00:00Z'), 'Europe')).toBe('Wednesday')
  })
  it('America and Asia use their own offsets', () => {
    expect(serverWeekday(new Date('2026-09-23T08:59:00Z'), 'America')).toBe('Tuesday')
    expect(serverWeekday(new Date('2026-09-23T09:00:00Z'), 'America')).toBe('Wednesday')
    expect(serverWeekday(new Date('2026-09-22T20:00:00Z'), 'Asia')).toBe('Wednesday')
  })
})

const talents = { normal: 1, skill: 1, burst: 1 }
const furinaGoal: Goal = {
  id: 'g',
  characterKey: 'furina',
  targetLevel: 90,
  targetAscension: 6,
  targetTalents: { normal: 1, skill: 9, burst: 9 },
  createdAt: '2026-09-23',
}

describe('farming plan', () => {
  const needs = goalNeeds(furinaGoal, { level: 80, ascension: 5, talents })
  const fams = families(needs, new Map())

  it('groups Justice books into one family in 2★ equivalents', () => {
    const books = fams.find((f) => f.name === 'Philosophies of Justice')!
    expect(books.kind).toBe('talent')
    // Talents 1→9 twice: per talent 3 teal·1 + (2+4+6+9)·3 + (4+6+12)·9 = 3 + 63 + 198
    expect(books.need).toBe(2 * (3 + 63 + 198))
    expect(books.domain?.days).toEqual(['Tuesday', 'Friday', 'Sunday'])
  })

  it('shows the Justice domain on Tuesday and Sunday, not Wednesday', () => {
    expect(domainsToday(fams, 'Tuesday').map((d) => d.domain)).toEqual([
      'Domain of Mastery: Admonishing Engraving',
    ])
    expect(domainsToday(fams, 'Sunday')).toHaveLength(1)
    expect(domainsToday(fams, 'Wednesday')).toEqual([])
  })

  it('lists world and weekly boss needs', () => {
    const names = bossNeeds(fams).map((f) => `${f.kind}:${f.name}`)
    expect(names).toContain('boss:Water That Failed To Transcend')
    expect(names).toContain('weekly:Lightless Mass')
  })

  it('estimates resin from average drops', () => {
    const est = resinEstimate(needs, new Map(), { resinPerDay: 180, worldLevel: 8 })
    const talentRate = drops.talentDomain[3].reduce((s, n, i) => s + n * 3 ** i, 0)
    const bookRuns = Math.ceil(528 / talentRate)
    // World boss: max of gem runs and boss-material runs at WL 8.
    const boss = drops.worldBoss[8]
    const gemRuns = Math.ceil((6 * 27) / (boss[0] + boss[1] * 3 + boss[2] * 9 + boss[3] * 27))
    const matRuns = Math.ceil(20 / boss[4])
    expect(est.resin).toBe(bookRuns * 20 + Math.max(gemRuns, matRuns) * 40)
    expect(est.days).toBe(Math.ceil(est.resin / 180))
    expect(est.notCounted).toEqual(['weekly boss drops', 'EXP and Mora (ley lines)'])
  })

  it('owned materials reduce the estimate, and a finished goal needs no resin', () => {
    const counts = new Map([[104343, 60]]) // 60 purple Justice books
    const less = resinEstimate(needs, counts, { resinPerDay: 180, worldLevel: 8 })
    const full = resinEstimate(needs, new Map(), { resinPerDay: 180, worldLevel: 8 })
    expect(less.resin).toBeLessThan(full.resin)
    const done = goalNeeds(furinaGoal, {
      level: 90,
      ascension: 6,
      talents: furinaGoal.targetTalents,
    })
    expect(resinEstimate(done, new Map(), { resinPerDay: 180, worldLevel: 8 })).toEqual({
      resin: 0,
      days: 0,
      notCounted: [],
    })
  })
})

describe('world level', () => {
  it('WL 9 uses the WL 8 rates (no WL 9 data)', () => {
    const needs = goalNeeds(furinaGoal, { level: 80, ascension: 5, talents })
    const wl8 = resinEstimate(needs, new Map(), { resinPerDay: 180, worldLevel: 8 })
    const wl9 = resinEstimate(needs, new Map(), { resinPerDay: 180, worldLevel: 9 })
    expect(drops.worldBoss).toHaveLength(9)
    expect(wl9).toEqual(wl8)
  })
})
