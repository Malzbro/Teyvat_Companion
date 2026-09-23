// Reads an Enka.Network showcase response into app data (Step 13).
// Field names from docs/gi/api.md in github.com/EnkaNetwork/API-docs.

import { characters, weapons, artifactSets, type ArtifactSlot, type StatKey } from '../data'
import enkaJson from '../data/generated/enka.json'
import type { Artifact, TalentLevels } from '../db/types'

const skillOrder = (enkaJson as { skillOrder: Record<string, number[]> }).skillOrder

const PROPS: Record<string, StatKey> = {
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

const SLOTS: Record<string, ArtifactSlot> = {
  EQUIP_BRACER: 'flower',
  EQUIP_NECKLACE: 'plume',
  EQUIP_SHOES: 'sands',
  EQUIP_RING: 'goblet',
  EQUIP_DRESS: 'circlet',
}

export interface EnkaCharacter {
  key: string
  name: string
  level: number
  ascension: number
  constellation: number
  talents: TalentLevels
  weapon?: { key: string; name: string; level: number; ascension: number; refinement: number }
  artifacts: Omit<Artifact, 'id'>[]
}

export interface Showcase {
  player: { nickname: string; level: number; worldLevel?: number }
  characters: EnkaCharacter[]
  /** Things we couldn't read, in plain words. */
  skipped: string[]
}

// Loose shapes of the parts of the response we use.
interface Stat {
  mainPropId?: string
  appendPropId?: string
  statValue?: number
  propValue?: number
}
interface EquipItem {
  itemId: number
  weapon?: { level?: number; promoteLevel?: number; affixMap?: Record<string, number> }
  reliquary?: { level?: number }
  flat?: {
    rankLevel?: number
    icon?: string
    equipType?: string
    itemType?: string
    reliquaryMainstat?: Stat
    reliquarySubstats?: Stat[]
  }
}
interface Avatar {
  avatarId: number
  propMap?: Record<string, { val?: string }>
  talentIdList?: number[]
  skillLevelMap?: Record<string, number>
  equipList?: EquipItem[]
}
interface Response {
  playerInfo?: { nickname?: string; level?: number; worldLevel?: number }
  avatarInfoList?: Avatar[]
}

/** Converts a shown value (3.9 for 3.9%) into our stored value (0.039). */
const toValue = (key: StatKey, shown: number) =>
  key.endsWith('_') ? Number((shown / 100).toFixed(6)) : shown

function readArtifact(
  item: EquipItem,
  skipped: string[],
  who: string,
): Omit<Artifact, 'id'> | null {
  const flat = item.flat ?? {}
  const setId = Number(/UI_RelicIcon_(\d+)_/.exec(flat.icon ?? '')?.[1])
  const set = artifactSets.find((s) => s.id === setId)
  const slot = SLOTS[flat.equipType ?? '']
  const main = flat.reliquaryMainstat
  const mainStat = main?.mainPropId && PROPS[main.mainPropId]
  if (!set || !slot || !mainStat) {
    skipped.push(`An artifact on ${who} we don't recognise`)
    return null
  }
  const substats = (flat.reliquarySubstats ?? [])
    .map((s) => {
      const key = s.appendPropId && PROPS[s.appendPropId]
      const shown = s.statValue ?? s.propValue
      return key && shown !== undefined ? { key, value: toValue(key, shown) } : null
    })
    .filter((s): s is Artifact['substats'][number] => !!s)
  return {
    setKey: set.key,
    slot,
    rarity: flat.rankLevel ?? 5,
    // Enka levels are 1–21; ours are 0–20.
    level: Math.max(0, (item.reliquary?.level ?? 1) - 1),
    mainStat,
    substats,
  }
}

export function parseShowcase(json: unknown): Showcase {
  const data = (json ?? {}) as Response
  const skipped: string[] = []
  const out: EnkaCharacter[] = []

  for (const avatar of data.avatarInfoList ?? []) {
    const character = characters.find((c) => c.id === avatar.avatarId)
    if (!character) {
      skipped.push(`A character we don't have data for (id ${avatar.avatarId}, e.g. the Traveler)`)
      continue
    }
    const level = Number(avatar.propMap?.['4001']?.val ?? 1)
    const ascension = Number(avatar.propMap?.['1002']?.val ?? 0)
    const order = skillOrder[character.key]
    const talent = (i: number) => (order ? (avatar.skillLevelMap?.[String(order[i])] ?? 1) : 1)
    if (!order) skipped.push(`${character.name}'s talent levels`)

    const weaponItem = avatar.equipList?.find((e) => e.weapon)
    const weaponData = weaponItem && weapons.find((w) => w.id === weaponItem.itemId)
    if (weaponItem && !weaponData) skipped.push(`${character.name}'s weapon`)
    const refine = weaponItem?.weapon?.affixMap ? Object.values(weaponItem.weapon.affixMap)[0] : 0

    out.push({
      key: character.key,
      name: character.name,
      level,
      ascension,
      constellation: avatar.talentIdList?.length ?? 0,
      // Base talent levels (constellation bonuses aren't included, which is what costs need).
      talents: { normal: talent(0), skill: talent(1), burst: talent(2) },
      weapon:
        weaponItem && weaponData
          ? {
              key: weaponData.key,
              name: weaponData.name,
              level: weaponItem.weapon?.level ?? 1,
              ascension: weaponItem.weapon?.promoteLevel ?? 0,
              refinement: (refine ?? 0) + 1,
            }
          : undefined,
      artifacts: (avatar.equipList ?? [])
        .filter((e) => e.reliquary)
        .map((e) => readArtifact(e, skipped, character.name))
        .filter((a): a is Omit<Artifact, 'id'> => !!a),
    })
  }

  return {
    player: {
      nickname: data.playerInfo?.nickname ?? '',
      level: data.playerInfo?.level ?? 0,
      worldLevel: data.playerInfo?.worldLevel,
    },
    characters: out,
    skipped,
  }
}

/** Friendly message for Enka's HTTP status codes. */
export function enkaErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "That UID doesn't look right. It should be 9 or 10 digits."
    case 404:
      return "The game says that player doesn't exist. Check the UID?"
    case 424:
      return 'The game is under maintenance or just updated. Try again in a little while.'
    case 429:
      return 'Too many requests right now. Wait a minute and try again.'
    default:
      return 'Enka.Network is having trouble. Try again later.'
  }
}

/** Fetches a showcase through our API route (/api/enka/:uid). */
export async function fetchShowcase(uid: string): Promise<Showcase> {
  const res = await fetch(`/api/enka/${encodeURIComponent(uid.trim())}`)
  if (!res.ok) throw new Error(enkaErrorMessage(res.status))
  return parseShowcase(await res.json())
}
