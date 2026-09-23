import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { newBuild, saveBuild } from '../../db/builds'
import { newCharacter, newWeapon, saveCharacter, saveWeapon } from '../../db/roster'
import { routes } from '../../routes'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  for (const k of ['furina', 'navia', 'bennett', 'xilonen']) await saveCharacter(newCharacter(k))
})

const renderAt = (path: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)

describe('TeamsScreen', () => {
  it('makes a team with a saved build and lets the same character join a second team', async () => {
    await saveBuild(newBuild((await db.characters.get('furina'))!, 'Support'))
    const user = userEvent.setup()
    renderAt('/teams')

    for (const name of ['Hydro fun', 'Geo party']) {
      await user.click(await screen.findByRole('button', { name: 'New team' }))
      const sheet = within(screen.getByRole('dialog'))
      await user.type(sheet.getByPlaceholderText('e.g. Hydro gang'), name)
      await user.click(sheet.getByRole('button', { name: /Add member/ }))
      await user.click(sheet.getByRole('button', { name: /Furina/ }))
      if (name === 'Hydro fun') {
        await user.click(sheet.getByRole('button', { name: /Equipped gear/ }))
        await user.click(sheet.getByRole('button', { name: /Support/ }))
      }
      await user.click(sheet.getByRole('button', { name: 'Add team' }))
    }

    const teams = await db.teamComps.toArray()
    expect(teams.map((t) => t.name).sort()).toEqual(['Geo party', 'Hydro fun'])
    const hydro = teams.find((t) => t.name === 'Hydro fun')!
    expect(hydro.members[0].buildId).not.toBeNull()
    expect(await screen.findByText('Geo party')).toBeInTheDocument()
  })

  it('adds a team from the guides, picking the alternative she owns', async () => {
    const user = userEvent.setup()
    renderAt('/teams')
    await user.click(await screen.findByRole('tab', { name: 'From guides' }))
    const card = (await screen.findByText('Navia Hypercarry')).closest('li')!
    expect(within(card).getByText('4/4 owned')).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Add to my teams' }))
    const [team] = await db.teamComps.toArray()
    expect(team.members.map((m) => m.characterKey)).toEqual([
      'furina',
      'bennett',
      'navia',
      'xilonen',
    ])
    expect(team.source).toBe('KQM Furina guide')
  })
})

describe('Weapon sheet', () => {
  it('equips a weapon to a character from the weapon itself', async () => {
    const sword = newWeapon('splendoroftranquilwaters')
    await saveWeapon(sword)
    const user = userEvent.setup()
    renderAt('/roster')
    await user.click(await screen.findByRole('tab', { name: 'Weapons' }))
    await user.click(await screen.findByRole('button', { name: /Splendor of Tranquil Waters/ }))
    await user.click(screen.getByRole('button', { name: /Nobody/ }))
    // Only sword users are offered.
    expect(screen.queryByRole('button', { name: /Navia/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: /Furina/ }))
    expect((await db.characters.get('furina'))!.weaponId).toBe(sword.id)
  })
})
