import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db'
import { newCharacter, saveCharacter } from '../db/roster'
import { routes } from '../routes'

const renderHome = () =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />)

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('HomeScreen', () => {
  it('invites her to set a goal when there are none', async () => {
    renderHome()
    expect(await screen.findByText('What are we working towards?')).toBeInTheDocument()
  })

  it("shows today's domain for her goals (Europe, Tuesday)", async () => {
    // Tue 22 Sep 2026, 12:00 Europe server time.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-22T11:00:00Z'))
    await saveCharacter({ ...newCharacter('furina'), level: 80, ascension: 5 })
    await db.goals.add({
      id: 'g',
      characterKey: 'furina',
      targetLevel: 90,
      targetAscension: 6,
      targetTalents: { normal: 1, skill: 9, burst: 9 },
      createdAt: '2026-09-22',
    })
    renderHome()
    expect(await screen.findByText('Today · Tuesday')).toBeInTheDocument()
    expect(screen.getByText('Admonishing Engraving')).toBeInTheDocument()
    expect(screen.getByText('For Furina')).toBeInTheDocument()
    expect(screen.getByText('Lightless Mass')).toBeInTheDocument()
    expect(screen.getByText(/About \d+ days of resin/)).toBeInTheDocument()
  })
})
