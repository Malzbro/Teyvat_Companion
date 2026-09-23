import { describe, expect, it } from 'vitest'
import { getCharacter } from '.'
import { GUIDE_TEAMS, suggestTeams } from './teamGuides'

describe('guide teams', () => {
  it('every character key exists in game data and teams have 4 slots', () => {
    for (const team of GUIDE_TEAMS) {
      expect(team.slots).toHaveLength(4)
      for (const k of team.slots.flat()) expect(getCharacter(k), k).toBeDefined()
    }
  })

  it('fills a slot with an owned alternative and lists the same party once', () => {
    const owned = new Set(['furina', 'navia', 'bennett', 'xilonen', 'yelan'])
    const s = suggestTeams(owned)
    // Furina's "Navia Hypercarry": Zhongli / Xilonen → Xilonen, since she owns Xilonen.
    const hyper = s.find((x) => x.team.name === 'Navia Hypercarry')!
    expect(hyper.members).toEqual(['furina', 'bennett', 'navia', 'xilonen'])
    expect(hyper.ownedCount).toBe(4)
    // Navia's "Geo Hypercarry" is the same four people, so it isn't listed again.
    expect(s.find((x) => x.team.name === 'Geo Hypercarry')).toBeUndefined()
    const ids = s.map((x) => [...x.members].sort().join('|'))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
