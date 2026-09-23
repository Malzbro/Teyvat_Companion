import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ArtifactSlot, StatKey } from '../../data'
import { db, type Artifact } from '../../db'
import { newCharacter, saveCharacter } from '../../db/roster'
import { routes } from '../../routes'

const MAIN: Record<ArtifactSlot, StatKey> = {
  flower: 'hp',
  plume: 'atk',
  sands: 'hp_',
  goblet: 'hydro_dmg_',
  circlet: 'critDMG_',
}
const SLOTS = Object.keys(MAIN) as ArtifactSlot[]
const piece = (id: string, slot: ArtifactSlot, cr: number): Artifact => ({
  id,
  slot,
  setKey: 'goldentroupe',
  rarity: 5,
  level: 20,
  mainStat: MAIN[slot],
  substats: [
    { key: 'critRate_', value: cr },
    { key: 'critDMG_', value: 0.078 },
    { key: 'hp_', value: 0.053 },
    { key: 'enerRech_', value: 0.065 },
  ],
})

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  for (const key of ['yelan', 'bennett', 'xilonen']) await saveCharacter(newCharacter(key))
  // Furina wears weak pieces; stronger ones sit in the inventory.
  const weak = SLOTS.map((s) => piece(`weak-${s}`, s, 0.027))
  const strong = SLOTS.map((s) => piece(`strong-${s}`, s, 0.078))
  await db.artifacts.bulkAdd([...weak, ...strong])
  await saveCharacter({
    ...newCharacter('furina'),
    artifactIds: Object.fromEntries(SLOTS.map((s) => [s, `weak-${s}`])) as Record<
      ArtifactSlot,
      string
    >,
  })
})

const renderPage = () =>
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { initialEntries: ['/character/furina'] })}
    />,
  )

describe('CharacterScreen', () => {
  it('suggests a better build and equips it', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Furina' })).toBeInTheDocument()

    const equip = await screen.findByRole('button', { name: /Equip \(5 swaps\)/ })
    expect(screen.getAllByText(/^\+\d+\.\d%$/).length).toBeGreaterThan(0)
    await user.click(equip)

    await waitFor(async () => {
      const furina = await db.characters.get('furina')
      expect(Object.values(furina!.artifactIds)).toEqual(SLOTS.map((s) => `strong-${s}`))
    })
    expect(await screen.findByText('The best build your artifacts can make. ✿')).toBeInTheDocument()
  })

  it('a condition toggle changes the stats straight away', async () => {
    const user = userEvent.setup()
    renderPage()
    const skillRow = async () => (await screen.findByText('Elemental Skill DMG')).closest('div')!
    expect(within(await skillRow()).getByText('+70.0%')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: /Off-field: Skill DMG \+25% more/ }))
    expect(await within(await skillRow()).findByText('+45.0%')).toBeInTheDocument()
  })

  it('picking teammates lights up resonance', async () => {
    const user = userEvent.setup()
    renderPage()
    for (const [slot, name] of [
      ['Add teammate 1', 'Yelan'],
      ['Add teammate 2', 'Bennett'],
      ['Add teammate 3', 'Xilonen'],
    ]) {
      await user.click(await screen.findByRole('button', { name: slot }))
      await user.click(
        within(screen.getByRole('dialog', { name: 'Choose teammate' })).getByRole('button', {
          name: new RegExp(name),
        }),
      )
    }
    expect(await db.teams.get('furina')).toEqual({
      characterKey: 'furina',
      teammates: ['yelan', 'bennett', 'xilonen'],
    })
    const badge = await screen.findByText('Soothing Water')
    expect(badge.className).not.toMatch(/opacity-35/)
    expect(screen.getByText('Fervent Flames').className).toMatch(/opacity-35/)
  })
})
