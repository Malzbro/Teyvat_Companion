import { getArtifactSet } from '../data'

/** "4pc Golden Troupe", "2pc A + 2pc B" or "Mixed sets" from the set keys of worn pieces. */
export function setSummary(setKeys: (string | undefined)[]): string {
  const counts: Record<string, number> = {}
  for (const k of setKeys) if (k) counts[k] = (counts[k] ?? 0) + 1
  const name = (k: string) => getArtifactSet(k)?.name ?? k
  const four = Object.entries(counts).find(([, n]) => n >= 4)
  if (four) return `4pc ${name(four[0])}`
  const twos = Object.entries(counts).filter(([, n]) => n >= 2)
  if (twos.length) return twos.map(([k]) => `2pc ${name(k)}`).join(' + ')
  return setKeys.some(Boolean) ? 'Mixed sets' : 'No artifacts'
}
