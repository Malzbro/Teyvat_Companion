import { getCharacter, type CharacterData } from '../../data'
import { activeResonances } from '../../engine/modifiers'

/** Resonances a party of four lights up. */
export function partyResonances(keys: string[]) {
  const party = keys.map(getCharacter).filter((c): c is CharacterData => !!c)
  if (party.length < 4) return []
  return activeResonances({ character: party[0], teammates: party.slice(1), setCounts: {} })
}
