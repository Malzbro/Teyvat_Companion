import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getArtifactSet, getCharacter, getWeapon } from '../data'
import enkaJson from '../data/generated/enka.json'
import { AppDatabase } from '../db'
import { applyImport, planImport } from '../db/enkaImport'
import { newCharacter, saveCharacter } from '../db/roster'
import { enkaErrorMessage, parseShowcase } from './enka'

const order = (enkaJson as { skillOrder: Record<string, number[]> }).skillOrder.yelan
const emblem = getArtifactSet('emblemofseveredfate')!.id
const depth = getArtifactSet('heartofdepth')!.id

const relic = (
  equipType: string,
  setId: number,
  piece: number,
  main: [string, number],
  subs: [string, number][],
) => ({
  itemId: 90000 + piece,
  reliquary: { level: 21, mainPropId: 10001 },
  flat: {
    itemType: 'ITEM_RELIQUARY',
    rankLevel: 5,
    equipType,
    icon: `UI_RelicIcon_${setId}_${piece}`,
    reliquaryMainstat: { mainPropId: main[0], statValue: main[1] },
    reliquarySubstats: subs.map(([appendPropId, statValue]) => ({ appendPropId, statValue })),
  },
})

// Her Yelan, as Enka would return it (values from her real stat screen).
const showcase = {
  playerInfo: { nickname: 'Her', level: 60, worldLevel: 9 },
  ttl: 55,
  avatarInfoList: [
    {
      avatarId: getCharacter('yelan')!.id,
      propMap: { '4001': { val: '90' }, '1002': { val: '6' } },
      talentIdList: [1, 2, 3, 4, 5, 6],
      skillLevelMap: { [order[0]]: 1, [order[1]]: 9, [order[2]]: 10 },
      equipList: [
        {
          itemId: getWeapon('aquasimulacra')!.id,
          weapon: { level: 90, promoteLevel: 6, affixMap: { '15508': 3 } },
          flat: { itemType: 'ITEM_WEAPON', rankLevel: 5 },
        },
        relic(
          'EQUIP_BRACER',
          emblem,
          4,
          ['FIGHT_PROP_HP', 4780],
          [
            ['FIGHT_PROP_CHARGE_EFFICIENCY', 6.5],
            ['FIGHT_PROP_CRITICAL_HURT', 21.8],
            ['FIGHT_PROP_HP_PERCENT', 8.2],
            ['FIGHT_PROP_CRITICAL', 9.3],
          ],
        ),
        relic(
          'EQUIP_NECKLACE',
          emblem,
          2,
          ['FIGHT_PROP_ATTACK', 311],
          [
            ['FIGHT_PROP_CRITICAL', 10.9],
            ['FIGHT_PROP_CRITICAL_HURT', 18.7],
            ['FIGHT_PROP_ELEMENT_MASTERY', 21],
            ['FIGHT_PROP_CHARGE_EFFICIENCY', 6.5],
          ],
        ),
        relic(
          'EQUIP_SHOES',
          emblem,
          5,
          ['FIGHT_PROP_HP_PERCENT', 46.6],
          [
            ['FIGHT_PROP_HP', 299],
            ['FIGHT_PROP_CRITICAL', 5.4],
            ['FIGHT_PROP_CHARGE_EFFICIENCY', 11],
            ['FIGHT_PROP_CRITICAL_HURT', 21.8],
          ],
        ),
        relic(
          'EQUIP_RING',
          depth,
          1,
          ['FIGHT_PROP_WATER_ADD_HURT', 46.6],
          [
            ['FIGHT_PROP_CRITICAL', 10.1],
            ['FIGHT_PROP_DEFENSE', 21],
            ['FIGHT_PROP_CRITICAL_HURT', 13.2],
            ['FIGHT_PROP_HP_PERCENT', 8.7],
          ],
        ),
        relic(
          'EQUIP_DRESS',
          emblem,
          3,
          ['FIGHT_PROP_CRITICAL', 31.1],
          [
            ['FIGHT_PROP_CRITICAL_HURT', 21],
            ['FIGHT_PROP_CHARGE_EFFICIENCY', 11.7],
            ['FIGHT_PROP_DEFENSE_PERCENT', 12.4],
            ['FIGHT_PROP_HP', 478],
          ],
        ),
      ],
    },
    { avatarId: 10000007, propMap: { '4001': { val: '90' } } }, // Traveler
  ],
}

describe('parseShowcase', () => {
  const parsed = parseShowcase(showcase)

  it('reads her Yelan: level, constellation, talents, weapon', () => {
    const [yelan] = parsed.characters
    expect(yelan).toMatchObject({
      key: 'yelan',
      level: 90,
      ascension: 6,
      constellation: 6,
      talents: { normal: 1, skill: 9, burst: 10 },
      weapon: { key: 'aquasimulacra', level: 90, ascension: 6, refinement: 4 },
    })
    expect(parsed.player.worldLevel).toBe(9)
  })

  it('reads artifacts: set from icon, slot, level 1–21 → 0–20, % as fractions', () => {
    const arts = parsed.characters[0].artifacts
    expect(arts).toHaveLength(5)
    expect(arts.find((a) => a.slot === 'goblet')).toMatchObject({
      setKey: 'heartofdepth',
      level: 20,
      mainStat: 'hydro_dmg_',
    })
    expect(arts.find((a) => a.slot === 'flower')!.substats).toContainEqual({
      key: 'critDMG_',
      value: 0.218,
    })
    expect(arts.find((a) => a.slot === 'sands')!.substats).toContainEqual({ key: 'hp', value: 299 })
  })

  it('skips the Traveler and says so', () => {
    expect(parsed.characters).toHaveLength(1)
    expect(parsed.skipped[0]).toMatch(/Traveler/)
  })

  it('handles a hidden showcase and friendly errors', () => {
    expect(parseShowcase({ playerInfo: { nickname: 'x' } }).characters).toEqual([])
    expect(enkaErrorMessage(424)).toMatch(/maintenance/)
  })
})

describe('import', () => {
  let db: AppDatabase
  beforeEach(() => {
    db = new AppDatabase(`test-${crypto.randomUUID()}`)
  })
  afterEach(async () => {
    await db.delete()
  })

  it('plans new/changed/same and never writes before applying', async () => {
    const { characters } = parseShowcase(showcase)
    const plan = await planImport(characters, db)
    expect(plan[0].status).toBe('new')
    expect(await db.characters.count()).toBe(0)

    await saveCharacter(
      { ...newCharacter('yelan'), level: 80, ascension: 5, favourite: true, locked: true },
      db,
    )
    const changed = await planImport(characters, db)
    expect(changed[0].status).toBe('changed')
    expect(changed[0].changes).toContain('Level 80 → 90')
    expect(changed[0].changes).toContain('Weapon → Aqua Simulacra')
    expect(changed[0].changes).toContain('5 artifacts')
  })

  it('applies: keeps favourite/lock, adds weapon + artifacts, and re-import adds no duplicates', async () => {
    const { characters } = parseShowcase(showcase)
    await saveCharacter({ ...newCharacter('yelan'), favourite: true, locked: true }, db)
    const first = await applyImport(characters, db)
    expect(first).toEqual({ characters: 1, weaponsAdded: 1, artifactsAdded: 5 })

    const yelan = (await db.characters.get('yelan'))!
    expect(yelan).toMatchObject({ favourite: true, locked: true, constellation: 6 })
    expect(Object.values(yelan.artifactIds).every(Boolean)).toBe(true)

    expect((await planImport(characters, db))[0].status).toBe('same')
    const again = await applyImport(characters, db)
    expect(again).toEqual({ characters: 1, weaponsAdded: 0, artifactsAdded: 0 })
    expect(await db.artifacts.count()).toBe(5)
    expect(await db.weapons.count()).toBe(1)
  })
})
