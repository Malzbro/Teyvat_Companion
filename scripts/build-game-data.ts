// Builds the trimmed game-data snapshot in src/data/generated/ from genshin-db.
// Run with: npm run build:data
/* eslint-disable @typescript-eslint/no-explicit-any -- genshin-db raw data is untyped */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  ArtifactSetData,
  ArtifactSlot,
  CharacterData,
  CurveTable,
  Element,
  GameDataMeta,
  MaterialCost,
  MaterialData,
  StatKey,
  WeaponData,
  WeaponType,
  Weekday,
} from '../src/data/types.ts'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src/data/generated')

// genshin-db ships one bundle; raw stats/curves are only reachable here, not via the public API.
const all: any = require('genshin-db/src/min/data.min.json')
const en = all.data.English
const genshinDbVersion: string = require('genshin-db/package.json').version

const STAT: Record<string, StatKey> = {
  FIGHT_PROP_HP: 'hp',
  FIGHT_PROP_HP_PERCENT: 'hp_',
  FIGHT_PROP_ATTACK: 'atk',
  FIGHT_PROP_ATTACK_PERCENT: 'atk_',
  FIGHT_PROP_DEFENSE: 'def',
  FIGHT_PROP_DEFENSE_PERCENT: 'def_',
  FIGHT_PROP_ELEMENT_MASTERY: 'eleMas',
  FIGHT_PROP_CHARGE_EFFICIENCY: 'enerRech_',
  FIGHT_PROP_HEAL_ADD: 'heal_',
  FIGHT_PROP_CRITICAL: 'critRate_',
  FIGHT_PROP_CRITICAL_HURT: 'critDMG_',
  FIGHT_PROP_PHYSICAL_ADD_HURT: 'physical_dmg_',
  FIGHT_PROP_FIRE_ADD_HURT: 'pyro_dmg_',
  FIGHT_PROP_WATER_ADD_HURT: 'hydro_dmg_',
  FIGHT_PROP_ELEC_ADD_HURT: 'electro_dmg_',
  FIGHT_PROP_ICE_ADD_HURT: 'cryo_dmg_',
  FIGHT_PROP_WIND_ADD_HURT: 'anemo_dmg_',
  FIGHT_PROP_ROCK_ADD_HURT: 'geo_dmg_',
  FIGHT_PROP_GRASS_ADD_HURT: 'dendro_dmg_',
}

const WEAPON: Record<string, WeaponType> = {
  WEAPON_SWORD_ONE_HAND: 'Sword',
  WEAPON_CLAYMORE: 'Claymore',
  WEAPON_POLE: 'Polearm',
  WEAPON_BOW: 'Bow',
  WEAPON_CATALYST: 'Catalyst',
}

const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

function stat(prop: string): StatKey {
  const key = STAT[prop]
  if (!key) throw new Error(`Unknown stat prop ${prop}`)
  return key
}

/** Strips in-game rich-text markup like <color=#fff>…</color> and {LINK#…}…{/LINK}. */
function clean(text: string | undefined): string {
  return (text ?? '')
    .replace(/<\/?color[^>]*>/g, '')
    .replace(/\{LINK#[^}]*\}|\{\/LINK\}/g, '')
    .trim()
}

const materialIds = new Set<number>()
function costs(list: { id: number; count: number }[] | undefined): MaterialCost[] {
  return (list ?? []).map(({ id, count }) => {
    materialIds.add(id)
    return { id, count }
  })
}

// --- Characters -------------------------------------------------------------

const TRAVELERS = new Set(['aether', 'lumine', 'manekin', 'manekina'])
const skippedCharacters: string[] = []
const characters: CharacterData[] = []

for (const [key, c] of Object.entries<any>(en.characters)) {
  const s = all.stats.characters[key]
  const img = all.image.characters?.[key] ?? {}
  const t = en.talents[key]
  if (TRAVELERS.has(key) || !s || !t) {
    skippedCharacters.push(c.name)
    continue
  }
  characters.push({
    key,
    id: c.id,
    name: c.name,
    element: c.elementText as Element,
    weaponType: WEAPON[c.weaponType],
    rarity: c.rarity,
    region: c.region ?? '',
    version: all.version.characters?.[key] ?? '',
    ascensionStat: stat(c.substatType),
    base: { hp: s.base.hp, atk: s.base.attack, def: s.base.defense },
    curve: { hp: s.curve.hp, atk: s.curve.attack, def: s.curve.defense },
    ascension: s.promotion.map((p: any) => ({
      maxLevel: p.maxlevel,
      hp: p.hp,
      atk: p.attack,
      def: p.defense,
      stat: p.specialized,
    })),
    ascensionCosts: [1, 2, 3, 4, 5, 6].map((n) => costs(c.costs?.[`ascend${n}`])),
    talentCosts: [2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => costs(t.costs?.[`lvl${n}`])),
    talentNames: { normal: t.combat1.name, skill: t.combat2.name, burst: t.combat3.name },
    icons: {
      icon: img.filename_icon,
      side: img.filename_sideIcon,
      card: img.filename_iconCard ?? img.filename_icon,
      splash: img.filename_gachaSplash ?? '',
    },
  })
}
characters.sort((a, b) => a.name.localeCompare(b.name))

// --- Weapons ----------------------------------------------------------------

const weapons: WeaponData[] = []
for (const [key, w] of Object.entries<any>(en.weapons)) {
  const s = all.stats.weapons[key]
  const img = all.image.weapons?.[key] ?? {}
  if (!s) continue
  const refinements = [1, 2, 3, 4, 5]
    .map((r) => w[`r${r}`]?.values as string[] | undefined)
    .filter((v): v is string[] => !!v)
  weapons.push({
    key,
    id: w.id,
    name: w.name,
    type: WEAPON[w.weaponType],
    rarity: w.rarity,
    version: all.version.weapons?.[key] ?? '',
    substat: w.mainStatType ? stat(w.mainStatType) : null,
    base: { atk: s.base.attack, substat: s.base.specialized ?? 0 },
    curve: { atk: s.curve.attack, substat: s.curve.specialized ?? '' },
    ascension: s.promotion.map((p: any) => ({ maxLevel: p.maxlevel, atk: p.attack })),
    ascensionCosts: Object.keys(w.costs ?? {})
      .sort()
      .map((k) => costs(w.costs[k])),
    passive: w.effectName
      ? { name: w.effectName, template: clean(w.effectTemplateRaw), refinements }
      : null,
    icons: { icon: img.filename_icon, awakened: img.filename_awakenIcon ?? '' },
  })
}
weapons.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))

// --- Artifact sets ----------------------------------------------------------

// Map artifact set name → domain entrance, from domain reward previews.
const setDomain = new Map<string, string>()
for (const d of Object.values<any>(en.domains)) {
  if (d.domainType !== 'UI_ABYSSUS_RELIC') continue
  for (const r of d.rewardPreview ?? []) setDomain.set(r.name, d.entranceName)
}

const artifactSets: ArtifactSetData[] = []
for (const [key, a] of Object.entries<any>(en.artifacts)) {
  // 1-piece "Prayers" sets have only a circlet and no useful bonus; skip them.
  if (!a.effect2Pc || !a.flower) continue
  artifactSets.push({
    key,
    id: a.id,
    name: a.name,
    rarities: a.rarityList,
    version: all.version.artifacts?.[key] ?? '',
    twoPiece: clean(a.effect2Pc),
    fourPiece: clean(a.effect4Pc),
    domain: setDomain.get(a.name) ?? null,
    icons: Object.fromEntries(
      SLOTS.map((s) => [s, all.image.artifacts?.[key]?.[`filename_${s}`] ?? '']),
    ) as Record<ArtifactSlot, string>,
  })
}
artifactSets.sort(
  (a, b) => Math.max(...b.rarities) - Math.max(...a.rarities) || a.name.localeCompare(b.name),
)

// --- Materials (only those referenced by a cost) ----------------------------

const materialsById = new Map<number, any>()
for (const [key, m] of Object.entries<any>(en.materials)) materialsById.set(m.id, { ...m, key })

const missingMaterials: number[] = []
const materials: MaterialData[] = []
for (const id of [...materialIds].sort((a, b) => a - b)) {
  const m = materialsById.get(id)
  if (!m) {
    missingMaterials.push(id)
    continue
  }
  materials.push({
    id,
    name: m.name,
    rarity: m.rarity ?? 1,
    type: m.typeText ?? '',
    sortRank: m.sortRank ?? 0,
    sources: (m.sources ?? []).filter((s: string) => !s.startsWith('Placeholder')),
    domain: m.daysOfWeek ? { name: m.dropDomainName ?? '', days: m.daysOfWeek as Weekday[] } : null,
    icon: all.image.materials?.[m.key]?.filename_icon ?? '',
  })
}

// --- Curves (only the curve names we reference) -----------------------------

function trimCurves(table: Record<string, Record<string, number>>, names: Set<string>): CurveTable {
  const out: CurveTable = [{}]
  for (let level = 1; level <= 100; level++) {
    const row: Record<string, number> = {}
    for (const n of names) row[n] = table[level][n]
    out.push(row)
  }
  return out
}
const characterCurves = trimCurves(
  all.curve.characters,
  new Set(characters.flatMap((c) => [c.curve.hp, c.curve.atk, c.curve.def])),
)
const weaponCurves = trimCurves(
  all.curve.weapons,
  new Set(weapons.flatMap((w) => [w.curve.atk, w.curve.substat]).filter(Boolean)),
)

// --- Meta & output ----------------------------------------------------------

const versions = [...characters, ...weapons, ...artifactSets].map((x) => x.version).filter(Boolean)
const gameVersion = versions.sort((a, b) => {
  const [am, an] = a.split('.').map(Number)
  const [bm, bn] = b.split('.').map(Number)
  return bm - am || bn - an
})[0]

const meta: GameDataMeta = {
  genshinDbVersion,
  gameVersion,
  generatedAt: new Date().toISOString().slice(0, 10),
  counts: {
    characters: characters.length,
    weapons: weapons.length,
    artifactSets: artifactSets.length,
    materials: materials.length,
  },
}

mkdirSync(outDir, { recursive: true })
const write = (name: string, data: unknown) =>
  writeFileSync(join(outDir, name), JSON.stringify(data) + '\n')
write('characters.json', characters)
write('weapons.json', weapons)
write('artifact-sets.json', artifactSets)
write('materials.json', materials)
write('curves.json', { characters: characterCurves, weapons: weaponCurves })
write('meta.json', meta)

// --- Summary ----------------------------------------------------------------

const owned: string[] = JSON.parse(
  readFileSync(join(root, 'scripts/owned-characters.json'), 'utf8'),
)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const missingOwned = owned.filter((n) => !characters.some((c) => norm(c.name) === norm(n)))

console.log(`genshin-db ${genshinDbVersion} — game data up to v${gameVersion}`)
console.log(
  `characters ${meta.counts.characters}, weapons ${meta.counts.weapons}, ` +
    `artifact sets ${meta.counts.artifactSets}, materials ${meta.counts.materials}`,
)
console.log(`skipped characters: ${skippedCharacters.join(', ') || 'none'}`)
if (missingMaterials.length) console.log(`materials without data: ${missingMaterials.join(', ')}`)
console.log(
  missingOwned.length
    ? `MISSING owned characters: ${missingOwned.join(', ')}`
    : `all ${owned.length} owned characters found`,
)
