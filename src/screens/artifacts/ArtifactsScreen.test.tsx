import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { newCharacter, saveCharacter } from '../../db/roster'
import { ArtifactsScreen } from './ArtifactsScreen'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function openAdd(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByRole('button', { name: 'Add artifact' }))[0])
}

describe('ArtifactsScreen', () => {
  it('quick-adds a flower, remembers the set, and moves on to the plume', async () => {
    const user = userEvent.setup()
    render(<ArtifactsScreen />)
    await openAdd(user)

    // First time: pick a set.
    await user.type(screen.getByPlaceholderText('Search sets'), 'golden troupe')
    await user.click(screen.getByRole('button', { name: /Golden Troupe/ }))

    // Flower's main stat is automatic (HP). Add 4 substats.
    for (const [chip, value] of [
      ['Crit Rate', '7.8'],
      ['Crit DMG', '14'],
      ['HP%', '5.3'],
      ['ER', '6.5'],
    ]) {
      await user.click(screen.getByRole('button', { name: chip }))
      await user.keyboard(value)
    }
    await user.click(screen.getByRole('button', { name: 'Save & next' }))

    expect(await screen.findByText(/Saved 1 artifact/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Plume' })).toBeChecked()
    const [saved] = await db.artifacts.toArray()
    expect(saved).toMatchObject({
      setKey: 'goldentroupe',
      slot: 'flower',
      mainStat: 'hp',
      level: 20,
    })
    expect(saved.substats.map((s) => s.key)).toEqual(['critRate_', 'critDMG_', 'hp_', 'enerRech_'])
    expect((await db.settings.get('lastArtifactSet'))?.value).toBe('goldentroupe')
  })

  it('blocks an impossible value with a friendly message', async () => {
    const user = userEvent.setup()
    await db.settings.put({ key: 'lastArtifactSet', value: 'goldentroupe' })
    render(<ArtifactsScreen />)
    await openAdd(user)

    for (const [chip, value] of [
      ['Crit Rate', '4.2'],
      ['Crit DMG', '14'],
      ['HP%', '5.3'],
      ['ER', '6.5'],
    ]) {
      await user.click(screen.getByRole('button', { name: chip }))
      await user.keyboard(value)
    }
    await user.click(screen.getByRole('button', { name: 'Save & close' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      "CRIT Rate 4.2% isn't possible on a 5★ artifact. Closest: 3.9% or 5.4%.",
    )
    expect(await db.artifacts.count()).toBe(0)
  })

  it('equips an artifact to a character', async () => {
    const user = userEvent.setup()
    await saveCharacter(newCharacter('furina'))
    await db.artifacts.add({
      id: 'a1',
      setKey: 'goldentroupe',
      slot: 'flower',
      rarity: 5,
      level: 20,
      mainStat: 'hp',
      substats: [
        { key: 'critRate_', value: 0.078 },
        { key: 'critDMG_', value: 0.14 },
        { key: 'hp_', value: 0.053 },
        { key: 'enerRech_', value: 0.065 },
      ],
    })
    render(<ArtifactsScreen />)
    await user.click(await screen.findByRole('button', { name: /Golden Troupe flower/ }))
    await user.click(screen.getByRole('button', { name: /Nobody/ }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Furina/ }))
    expect((await db.characters.get('furina'))!.artifactIds.flower).toBe('a1')
    expect(await screen.findByRole('button', { name: /on Furina/ })).toBeInTheDocument()
  })
})
