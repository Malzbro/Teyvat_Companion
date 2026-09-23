// Artifact rules: main stat values and validation. Numbers come from artifact-stats.json.

import { getArtifactSet } from '../data'
import artifactStatsJson from '../data/generated/artifact-stats.json'
import { STAT_LABELS, isPercent, toDisplay } from '../data/stats'
import type { ArtifactSlot, ArtifactStatsData, StatKey } from '../data/types'
import type { Artifact } from '../db/types'

export const artifactStats = artifactStatsJson as unknown as ArtifactStatsData

export const ARTIFACT_SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

export const SLOT_LABELS: Record<ArtifactSlot, string> = {
  flower: 'Flower',
  plume: 'Plume',
  sands: 'Sands',
  goblet: 'Goblet',
  circlet: 'Circlet',
}

/** Levels at which an artifact gains a roll. */
const LEVELS_PER_ROLL = 4

export const maxArtifactLevel = (rarity: number) => artifactStats.maxLevel[rarity] ?? 20

export const allowedMainStats = (slot: ArtifactSlot) => artifactStats.slotMainStats[slot]

/** Main stat value for a rarity and level (fraction for % stats). */
export function mainStatValue(rarity: number, key: StatKey, level: number): number {
  return artifactStats.mainValues[rarity]?.[key]?.[level] ?? 0
}

/** Fewest rolls that can produce this substat value, or null if the game can't show it. */
export function rollsForValue(rarity: number, key: StatKey, value: number): number | null {
  return artifactStats.subValues[rarity]?.[key]?.[toDisplay(key, value)] ?? null
}

/** The nearest valid values below and above, for a helpful error message. */
function nearestValues(rarity: number, key: StatKey, value: number): string {
  const shown = Number(toDisplay(key, value))
  const all = Object.keys(artifactStats.subValues[rarity]?.[key] ?? {})
    .map(Number)
    .sort((a, b) => a - b)
  const below = all.filter((v) => v < shown).at(-1)
  const above = all.find((v) => v > shown)
  const unit = isPercent(key) ? '%' : ''
  const fmt = (v: number) => (isPercent(key) ? v.toFixed(1) : String(v)) + unit
  if (below !== undefined && above !== undefined) return `Closest: ${fmt(below)} or ${fmt(above)}.`
  if (above !== undefined) return `The lowest is ${fmt(above)}.`
  if (below !== undefined) return `The highest is ${fmt(below)}.`
  return ''
}

/** Returns friendly problems with an artifact, or an empty list if it's valid. */
export function validateArtifact(a: Omit<Artifact, 'id'>): string[] {
  const errors: string[] = []
  const set = getArtifactSet(a.setKey)
  if (!set) return ['Pick an artifact set.']
  if (!artifactStats.rarities.includes(a.rarity) || !set.rarities.includes(a.rarity))
    errors.push(`${set.name} doesn't come in ${a.rarity}★.`)

  const maxLevel = maxArtifactLevel(a.rarity)
  if (a.level < 0 || a.level > maxLevel)
    errors.push(`A ${a.rarity}★ artifact goes up to +${maxLevel}.`)

  if (!allowedMainStats(a.slot).includes(a.mainStat))
    errors.push(
      `A ${SLOT_LABELS[a.slot].toLowerCase()} can't have ${STAT_LABELS[a.mainStat]} as its main stat.`,
    )

  if (a.substats.length > 4) errors.push('An artifact has at most 4 substats.')
  const keys = a.substats.map((s) => s.key)
  if (new Set(keys).size !== keys.length) errors.push('Each substat can only appear once.')
  if (keys.includes(a.mainStat))
    errors.push(`${STAT_LABELS[a.mainStat]} is the main stat, so it can't also be a substat.`)

  let rolls = 0
  for (const s of a.substats) {
    if (!artifactStats.substatKeys.includes(s.key)) {
      errors.push(`${STAT_LABELS[s.key]} can't be a substat.`)
      continue
    }
    const n = rollsForValue(a.rarity, s.key, s.value)
    if (n === null) {
      const unit = isPercent(s.key) ? '%' : ''
      errors.push(
        `${STAT_LABELS[s.key]} ${toDisplay(s.key, s.value)}${unit} isn't possible on a ${a.rarity}★ artifact. ${nearestValues(a.rarity, s.key, s.value)}`.trim(),
      )
    } else rolls += n
  }

  // Each artifact starts with `low`–`high` substats and gains one roll every 4 levels.
  const count = artifactStats.substatCount[a.rarity]
  if (count && errors.length === 0) {
    const upgrades = Math.floor(a.level / LEVELS_PER_ROLL)
    const minSubs = Math.min(4, count.low + upgrades)
    if (a.substats.length < minSubs)
      errors.push(`A +${a.level} ${a.rarity}★ artifact has at least ${minSubs} substats.`)
    if (rolls > count.high + upgrades)
      errors.push(
        `These substats need more upgrades than a +${a.level} artifact has. Check the level or the values.`,
      )
  }
  return errors
}
