import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

const renderAt = (path: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)

describe('App shell', () => {
  it('renders home with the tab bar', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Teyvat Companion' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const tab of ['Home', 'Roster', 'Artifacts', 'Materials'])
      expect(nav).toHaveTextContent(tab)
  })

  it('navigates between tabs', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('link', { name: 'Roster' }))
    expect(screen.getByRole('heading', { name: 'Roster' })).toBeInTheDocument()
  })

  it('renders the styleguide and opens the sheet', async () => {
    renderAt('/styleguide')
    await userEvent.click(screen.getByRole('button', { name: 'Open bottom sheet' }))
    expect(screen.getByRole('dialog', { name: 'Edit Yelan' })).toBeInTheDocument()
  })
})
