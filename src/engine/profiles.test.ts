import { describe, expect, it } from 'vitest'
import { getArtifactSet, getCharacter } from '../data'
import { allowedMainStats } from './artifact'
import { PROFILES, getProfile, reactionMultiplier } from './profiles'

const HERS = [
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
  'clorinde',
]

describe('profiles', () => {
  it('every character she owns has a profile', () => {
    for (const key of HERS) expect(getProfile(key), key).toBeDefined()
    for (const key of ['sandrone', 'odette', 'varka', 'durin'])
      expect(getProfile(key)!.generic, key).toBe(true)
  })

  it('profiles match the character and use valid main stats and sets', () => {
    for (const p of Object.values(PROFILES)) {
      const c = getCharacter(p.key)!
      expect(c, p.key).toBeDefined()
      expect(p.damage.element, p.key).toBe(c.element)
      for (const [slot, stats] of [
        ['sands', p.sands],
        ['goblet', p.goblet],
        ['circlet', p.circlet],
      ] as const)
        for (const s of stats) expect(allowedMainStats(slot), `${p.key} ${slot} ${s}`).toContain(s)
      for (const key of [...p.sets.fourPiece, ...p.sets.twoPlusTwo.flat()])
        expect(getArtifactSet(key), `${p.key} set ${key}`).toBeDefined()
    }
  })

  it('generic profile follows the element', () => {
    const p = getProfile('varka')!
    expect(p.goblet).toEqual([`${getCharacter('varka')!.element.toLowerCase()}_dmg_`])
    expect(p.scaling).toBe('atk')
  })

  it('reaction multiplier', () => {
    expect(reactionMultiplier({ kind: 'none' }, 500)).toBe(1)
    expect(reactionMultiplier({ kind: 'vaporize', base: 1.5 }, 0)).toBe(1.5)
    // 100 EM: 1.5 × (1 + 2.78·100/1500)
    expect(reactionMultiplier({ kind: 'vaporize', base: 1.5 }, 100)).toBeCloseTo(
      1.5 * (1 + 278 / 1500),
      6,
    )
    expect(reactionMultiplier({ kind: 'melt', base: 2 }, 0, 0.15)).toBeCloseTo(2.3, 6)
  })
})
