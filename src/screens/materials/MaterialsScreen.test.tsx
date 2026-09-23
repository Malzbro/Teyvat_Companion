import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { newCharacter, saveCharacter } from '../../db/roster'
import { MaterialsScreen } from './MaterialsScreen'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await saveCharacter({ ...newCharacter('furina'), level: 80, ascension: 5 })
})

describe('MaterialsScreen', () => {
  it('shows Level 80 → 90 totals and updates live as counts change', async () => {
    const user = userEvent.setup()
    render(<MaterialsScreen />)

    await user.click((await screen.findAllByRole('button', { name: 'Add goal' }))[0])
    await user.click(screen.getByRole('button', { name: /Furina/ }))
    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    // Ascension 6 needs 6 Varunada Lazurite Gemstones.
    const gem = (await screen.findByText('Varunada Lazurite Gemstone')).closest(
      'div',
    )!.parentElement!
    expect(within(gem).getByText('0 / 6')).toBeInTheDocument()

    // 120,000 ascension + 3,423,125 EXP ÷ 5.
    const mora = screen.getByText('Mora').closest('div')!.parentElement!
    expect(within(mora).getByText('0 / 804,625')).toBeInTheDocument()

    // EXP shown as books: 3,423,125 EXP ≈ 172 Hero's Wit.
    expect(screen.getByText("About 172 more Hero's Wit")).toBeInTheDocument()

    // Typing a count updates the bar straight away.
    const input = within(gem).getByRole('textbox', { name: 'Varunada Lazurite Gemstone owned' })
    await user.clear(input)
    await user.type(input, '6{Enter}')
    expect(await within(gem).findByText('6 / 6')).toBeInTheDocument()
    expect(await db.materials.get(104124)).toEqual({ id: 104124, count: 6 })

    await user.click(
      within(gem).getByRole('button', { name: 'One less Varunada Lazurite Gemstone' }),
    )
    expect(await within(gem).findByText('5 / 6')).toBeInTheDocument()
  })
})
