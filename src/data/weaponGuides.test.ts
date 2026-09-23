import { describe, expect, it } from 'vitest'
import { getCharacter, getWeapon } from '.'
import { WEAPON_GUIDES } from './weaponGuides'

describe('weapon guides', () => {
  it('every weapon exists and matches the character’s weapon type', () => {
    for (const [key, guide] of Object.entries(WEAPON_GUIDES)) {
      const type = getCharacter(key)?.weaponType
      expect(type, key).toBeDefined()
      for (const w of guide.picks.flatMap((p) => p.weapons))
        expect(getWeapon(w)?.type, `${key}: ${w}`).toBe(type)
    }
  })

  it('covers all 15 of her characters', () => {
    expect(Object.keys(WEAPON_GUIDES)).toHaveLength(15)
  })
})
