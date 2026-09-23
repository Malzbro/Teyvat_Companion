import { describe, expect, it } from 'vitest'
import { shownTalents, talentBonus, talentText } from './talents'

describe('constellation talent boosts', () => {
  it('reads which talent C3/C5 boost from game data (Yelan: C3 Burst, C5 Skill)', () => {
    expect(talentBonus('yelan', 2)).toEqual({ normal: 0, skill: 0, burst: 0 })
    expect(talentBonus('yelan', 3)).toEqual({ normal: 0, skill: 0, burst: 3 })
    expect(talentBonus('yelan', 6)).toEqual({ normal: 0, skill: 3, burst: 3 })
  })

  it('handles Normal Attack boosts (Neuvillette C3)', () => {
    expect(talentBonus('neuvillette', 3).normal).toBe(3)
  })

  it('shows boosted levels up to 13', () => {
    const t = { normal: 10, skill: 10, burst: 10 }
    expect(shownTalents('yelan', 6, t)).toEqual({ normal: 10, skill: 13, burst: 13 })
    expect(talentText('yelan', 6, { normal: 1, skill: 9, burst: 10 })).toBe('1/12/13')
  })
})
