import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { newCharacter, saveCharacter } from '../db/roster'
import { routes } from '../routes'

const renderSettings = () =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/settings'] })} />)

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  localStorage.clear()
  document.documentElement.dataset.theme = 'dark'
})

describe('SettingsScreen', () => {
  it('resets everything only after confirming', async () => {
    const user = userEvent.setup()
    await saveCharacter(newCharacter('yelan'))
    renderSettings()
    await user.click(await screen.findByRole('button', { name: /Reset everything/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await db.characters.count()).toBe(1)

    await user.click(screen.getByRole('button', { name: /Reset everything/ }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(await screen.findByText('Everything was reset.')).toBeInTheDocument()
    expect(await db.characters.count()).toBe(0)
  })

  it('switches to the light theme and remembers it', async () => {
    const user = userEvent.setup()
    renderSettings()
    await user.click(await screen.findByRole('switch', { name: /Light theme/ }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
