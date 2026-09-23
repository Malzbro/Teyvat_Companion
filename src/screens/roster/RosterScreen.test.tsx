import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { RosterScreen } from './RosterScreen'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('RosterScreen', () => {
  it('adds, edits and removes a character', async () => {
    const user = userEvent.setup()
    render(<RosterScreen />)

    // Add Yelan.
    await user.click((await screen.findAllByRole('button', { name: 'Add character' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Add character' })
    await user.type(within(dialog).getByPlaceholderText('Search characters'), 'yelan')
    await user.click(within(dialog).getByRole('button', { name: /Yelan/ }))
    await user.click(screen.getByRole('button', { name: 'Increase Constellation' }))
    await user.click(screen.getByRole('button', { name: 'Add to roster' }))

    const card = await screen.findByRole('button', { name: 'Yelan, level 90, C1' })
    expect(await db.characters.get('yelan')).toMatchObject({ constellation: 1 })

    // Edit: set Elemental Burst to 2 and favourite.
    await user.click(card)
    await user.click(screen.getByRole('button', { name: 'Increase Elemental Burst' }))
    await user.click(screen.getByRole('button', { name: 'Favourite' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await db.characters.get('yelan')).toMatchObject({
      favourite: true,
      talents: { normal: 1, skill: 1, burst: 2 },
    })

    // Remove with confirm.
    await user.click(await screen.findByRole('button', { name: 'Yelan, level 90, C1' }))
    await user.click(screen.getByRole('button', { name: 'Remove from roster' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText('No characters yet')).toBeInTheDocument()
  })

  it('equips a new weapon of the matching type from the character sheet', async () => {
    const user = userEvent.setup()
    render(<RosterScreen />)
    await user.click((await screen.findAllByRole('button', { name: 'Add character' }))[0])
    await user.type(screen.getByPlaceholderText('Search characters'), 'furina')
    await user.click(screen.getByRole('button', { name: /Furina/ }))
    await user.click(screen.getByRole('button', { name: /No weapon/ }))
    await user.click(screen.getByRole('button', { name: /Add a new sword/ }))
    // Only swords are offered.
    expect(screen.queryByRole('button', { name: /Aqua Simulacra/ })).toBeNull()
    await user.type(screen.getByPlaceholderText('Search swords'), 'splendor')
    await user.click(screen.getByRole('button', { name: /Splendor of Tranquil Waters/ }))
    await user.click(screen.getByRole('button', { name: 'Add to roster' }))

    await screen.findByRole('button', { name: 'Furina, level 90, C0' })
    const [weapon] = await db.weapons.toArray()
    expect(weapon.key).toBe('splendoroftranquilwaters')
    expect((await db.characters.get('furina'))!.weaponId).toBe(weapon.id)
  })
})
