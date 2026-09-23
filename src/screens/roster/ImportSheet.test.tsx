import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCharacter, getWeapon } from '../../data'
import { db } from '../../db'
import { newCharacter, saveCharacter } from '../../db/roster'
import { ImportSheet } from './ImportSheet'

const showcase = {
  playerInfo: { nickname: 'Her', level: 60 },
  ttl: 60,
  avatarInfoList: [
    {
      avatarId: getCharacter('furina')!.id,
      propMap: { '4001': { val: '90' }, '1002': { val: '6' } },
      talentIdList: [1, 2],
      equipList: [
        {
          itemId: getWeapon('splendoroftranquilwaters')!.id,
          weapon: { level: 90, promoteLevel: 6, affixMap: { x: 0 } },
        },
      ],
    },
    {
      avatarId: getCharacter('bennett')!.id,
      propMap: { '4001': { val: '80' }, '1002': { val: '5' } },
    },
  ],
}

const mockFetch = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})
afterEach(() => vi.restoreAllMocks())

describe('ImportSheet', () => {
  it('shows a review, and only imports what she ticks', async () => {
    const user = userEvent.setup()
    await saveCharacter({ ...newCharacter('bennett'), level: 80, ascension: 5, favourite: true })
    mockFetch(200, showcase)
    render(<ImportSheet onClose={() => {}} />)

    expect(screen.getByRole('textbox')).toHaveValue('725282297')
    await user.click(screen.getByRole('button', { name: /Load showcase/ }))

    const furina = await screen.findByRole('checkbox', { name: /Furina/ })
    const bennett = screen.getByRole('checkbox', { name: /Bennett/ })
    expect(furina).toHaveAttribute('aria-checked', 'true') // new
    expect(bennett).toHaveAttribute('aria-checked', 'false') // same
    expect(bennett).toHaveTextContent('Up to date')
    expect(await db.characters.count()).toBe(1) // nothing saved yet

    await user.click(screen.getByRole('button', { name: 'Import 1 selected' }))
    expect(await screen.findByText(/Imported 1 character, 1 new weapon/)).toBeInTheDocument()
    expect(await db.characters.get('furina')).toMatchObject({ level: 90, constellation: 2 })
    expect(await db.characters.get('bennett')).toMatchObject({ favourite: true })
  })

  it('explains maintenance errors kindly', async () => {
    const user = userEvent.setup()
    mockFetch(424, { message: 'down' })
    render(<ImportSheet onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Load showcase/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/under maintenance/)
  })
})
