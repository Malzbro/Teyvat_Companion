// Today's farming and resin estimates (Step 12).
// Drop rates: paimon.moe averages (drops.json). Resin: 20 per domain run, 40 per world boss.
// Lower tiers craft up 3:1, so needs are counted in 2★ equivalents.

import { getMaterial, type MaterialData, type Weekday } from '../data'
import dropsJson from '../data/generated/drops.json'
import type { DropData } from '../data/types'
import type { Needs } from './materials'

export const drops = dropsJson as unknown as DropData

export type Region = 'Europe' | 'America' | 'Asia' | 'TW/HK/MO'

/** Server time offset from UTC, in hours. Daily reset is 04:00 server time. */
export const REGION_UTC_OFFSET: Record<Region, number> = {
  Europe: 1,
  America: -5,
  Asia: 8,
  'TW/HK/MO': 8,
}
const RESET_HOUR = 4
const DAYS: Weekday[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const RESIN = { domainRun: 20, worldBoss: 40 }

/** The game's weekday for this region (it changes at 04:00 server time, not midnight). */
export function serverWeekday(now: Date, region: Region): Weekday {
  const shifted = new Date(now.getTime() + (REGION_UTC_OFFSET[region] - RESET_HOUR) * 3_600_000)
  return DAYS[shifted.getUTCDay()]
}

/** A group of materials that craft into each other (e.g. one talent book series). */
export interface Family {
  key: string
  kind: 'talent' | 'weapon' | 'gem' | 'boss' | 'weekly' | 'other'
  name: string
  domain: { name: string; days: Weekday[] } | null
  /** Needed/owned in lowest-tier equivalents. */
  need: number
  have: number
  /** Materials of this family that are needed, highest tier first. */
  materials: { material: MaterialData; need: number; have: number }[]
}

function familyOf(m: MaterialData): { key: string; kind: Family['kind']; name: string } {
  if (m.domain) {
    const kind = m.type === 'Weapon Ascension Material' ? 'weapon' : 'talent'
    return { key: `${m.domain.name}|${m.domain.days.join(',')}`, kind, name: m.name }
  }
  if (m.type === 'Character Ascension Material')
    return { key: `gem|${m.name.split(' ').slice(0, -1).join(' ')}`, kind: 'gem', name: m.name }
  if (m.type === 'Character Level-Up Material')
    return { key: `boss|${m.id}`, kind: m.rarity >= 5 ? 'weekly' : 'boss', name: m.name }
  return { key: `other|${m.id}`, kind: 'other', name: m.name }
}

/** Groups needed materials into craftable families, counting in lowest-tier equivalents. */
export function families(needs: Needs, counts: Map<number, number>): Family[] {
  const byKey = new Map<string, Family>()
  const rows = [...needs.materials]
    .map(([id, need]) => ({ material: getMaterial(id)!, need, have: counts.get(id) ?? 0 }))
    .filter((r) => r.material)
  for (const row of rows) {
    const f = familyOf(row.material)
    if (f.kind === 'other') continue
    let fam = byKey.get(f.key)
    if (!fam) {
      fam = {
        key: f.key,
        kind: f.kind,
        name: f.name,
        domain: row.material.domain,
        need: 0,
        have: 0,
        materials: [],
      }
      byKey.set(f.key, fam)
    }
    fam.materials.push(row)
  }
  for (const fam of byKey.values()) {
    const craftable = fam.kind === 'talent' || fam.kind === 'weapon' || fam.kind === 'gem'
    // Craftable series all start at 2★ (sliver, teachings, lowest weapon material).
    const weight = (m: MaterialData) => (craftable ? 3 ** (m.rarity - 2) : 1)
    fam.materials.sort((a, b) => b.material.rarity - a.material.rarity)
    fam.need = fam.materials.reduce((s, r) => s + r.need * weight(r.material), 0)
    // Only count what she has up to what's needed at each tier (extras can still craft up).
    fam.have = fam.materials.reduce((s, r) => s + r.have * weight(r.material), 0)
    fam.name = fam.materials[0].material.name
  }
  return [...byKey.values()]
}

const remaining = (f: Family) => Math.max(0, f.need - f.have)

/** Average lowest-tier equivalents per run of a Domain IV. */
function perRun(rates: number[]) {
  return rates.reduce((s, n, i) => s + n * 3 ** i, 0)
}

export interface ResinEstimate {
  resin: number
  /** Whole days at her daily resin. */
  days: number
  /** Things that don't cost resin or aren't counted (weekly bosses, ley lines). */
  notCounted: string[]
}

/** Resin needed for one goal's domain + world boss materials. */
export function resinEstimate(
  needs: Needs,
  counts: Map<number, number>,
  { resinPerDay, worldLevel }: { resinPerDay: number; worldLevel: number },
): ResinEstimate {
  const fams = families(needs, counts)
  const talentRate = perRun(drops.talentDomain[3])
  const weaponRate = perRun(drops.weaponDomain[3])
  const boss = drops.worldBoss[Math.min(Math.max(worldLevel, 0), drops.worldBoss.length - 1)]
  const gemRate = perRun(boss.slice(0, 4))
  const bossMatRate = boss[4]

  let resin = 0
  let bossRuns = 0
  for (const f of fams) {
    const left = remaining(f)
    if (!left) continue
    if (f.kind === 'talent') resin += Math.ceil(left / talentRate) * RESIN.domainRun
    if (f.kind === 'weapon') resin += Math.ceil(left / weaponRate) * RESIN.domainRun
    if (f.kind === 'gem') bossRuns = Math.max(bossRuns, Math.ceil(left / gemRate))
    if (f.kind === 'boss') bossRuns = Math.max(bossRuns, Math.ceil(left / bossMatRate))
  }
  resin += bossRuns * RESIN.worldBoss

  const notCounted: string[] = []
  const weekly = fams.filter((f) => f.kind === 'weekly' && remaining(f))
  if (weekly.length) notCounted.push('weekly boss drops')
  if (needs.characterExp || needs.weaponExp) notCounted.push('EXP and Mora (ley lines)')
  return { resin, days: Math.ceil(resin / resinPerDay), notCounted }
}

export interface DomainToday {
  domain: string
  kind: 'talent' | 'weapon'
  families: Family[]
}

/** Domains open today that drop something her goals still need. */
export function domainsToday(fams: Family[], day: Weekday): DomainToday[] {
  const out = new Map<string, DomainToday>()
  for (const f of fams) {
    if ((f.kind !== 'talent' && f.kind !== 'weapon') || !f.domain || !remaining(f)) continue
    if (!f.domain.days.includes(day)) continue
    const d = out.get(f.domain.name) ?? { domain: f.domain.name, kind: f.kind, families: [] }
    d.families.push(f)
    out.set(f.domain.name, d)
  }
  return [...out.values()]
}

/** Boss materials still needed (world and weekly). */
export function bossNeeds(fams: Family[]) {
  return fams.filter((f) => (f.kind === 'boss' || f.kind === 'weekly') && remaining(f))
}

export { remaining as familyRemaining }
