// Elemental Resonance from the team. Needs a full party of 4 with 2+ of an element.
// Numbers: from the plan (Pyro/Hydro/Cryo/Geo/Dendro) and the Dendro text she confirmed in Step 8.

import type { Element } from '../../data/types'
import type { ModifierContext, ModifierSet } from './types'
import { emptyModifierSet } from './types'

export interface Resonance {
  id: string
  name: string
  elements: Element[]
  /** True if it changes numbers here; false = shown for info only. */
  counted: boolean
  summary: string
}

export const RESONANCES: Record<string, Resonance> = {
  pyro: {
    id: 'pyro',
    name: 'Fervent Flames',
    elements: ['Pyro'],
    counted: true,
    summary: 'ATK +25%',
  },
  hydro: {
    id: 'hydro',
    name: 'Soothing Water',
    elements: ['Hydro'],
    counted: true,
    summary: 'Max HP +25%',
  },
  cryo: {
    id: 'cryo',
    name: 'Shattering Ice',
    elements: ['Cryo'],
    counted: true,
    summary: 'CRIT Rate +15% vs Cryo-affected or Frozen enemies',
  },
  dendro: {
    id: 'dendro',
    name: 'Sprawling Greenery',
    elements: ['Dendro'],
    counted: true,
    summary: 'EM +50, +30 and +20 more after reactions',
  },
  geo: {
    id: 'geo',
    name: 'Enduring Rock',
    elements: ['Geo'],
    counted: true,
    summary: 'DMG +15% while shielded',
  },
  electro: {
    id: 'electro',
    name: 'High Voltage',
    elements: ['Electro'],
    counted: false,
    summary: 'Energy particles; no damage stat',
  },
  anemo: {
    id: 'anemo',
    name: 'Impetuous Winds',
    elements: ['Anemo'],
    counted: false,
    summary: 'Stamina and cooldowns; no damage stat',
  },
  canopy: {
    id: 'canopy',
    name: 'Protective Canopy',
    elements: ['Pyro', 'Hydro', 'Electro', 'Cryo'],
    counted: false,
    summary: 'Four different elements: RES bonus; no damage stat',
  },
}

/** Which resonances a team has (character + 3 teammates). */
export function activeResonances(ctx: ModifierContext): Resonance[] {
  const party = [ctx.character, ...ctx.teammates.slice(0, 3)]
  if (party.length < 4) return []
  const counts = new Map<Element, number>()
  for (const c of party) counts.set(c.element, (counts.get(c.element) ?? 0) + 1)
  const out: Resonance[] = []
  for (const [element, n] of counts) {
    const r = RESONANCES[element.toLowerCase()]
    if (n >= 2 && r) out.push(r)
  }
  if (counts.size === 4) out.push(RESONANCES.canopy)
  return out
}

export function resonanceModifiers(ctx: ModifierContext): ModifierSet {
  const out = emptyModifierSet()
  for (const r of activeResonances(ctx)) {
    const source = `${r.name} (resonance)`
    switch (r.id) {
      case 'pyro':
        out.modifiers.push({ id: 'res-pyro', source, stat: 'atk_', value: 0.25 })
        break
      case 'hydro':
        out.modifiers.push({ id: 'res-hydro', source, stat: 'hp_', value: 0.25 })
        break
      case 'cryo':
        out.modifiers.push({
          id: 'res-cryo',
          source,
          stat: 'critRate_',
          value: 0.15,
          condition: 'res-cryo',
        })
        out.conditions.push({
          id: 'res-cryo',
          source,
          label: 'Enemy affected by Cryo or Frozen: CRIT Rate +15%',
          kind: 'toggle',
          default: 1,
        })
        break
      case 'dendro':
        out.modifiers.push(
          { id: 'res-dendro', source, stat: 'eleMas', value: 50 },
          { id: 'res-dendro-1', source, stat: 'eleMas', value: 30, condition: 'res-dendro-1' },
          { id: 'res-dendro-2', source, stat: 'eleMas', value: 20, condition: 'res-dendro-2' },
        )
        out.conditions.push(
          {
            id: 'res-dendro-1',
            source,
            label: 'After Burning, Quicken or Bloom: EM +30',
            kind: 'toggle',
            default: 1,
          },
          {
            id: 'res-dendro-2',
            source,
            label: 'After Aggravate, Spread, Hyperbloom or Burgeon: EM +20',
            kind: 'toggle',
            default: 1,
          },
        )
        break
      case 'geo':
        out.modifiers.push({
          id: 'res-geo',
          source,
          stat: 'dmg_',
          value: 0.15,
          condition: 'res-geo',
        })
        out.conditions.push({
          id: 'res-geo',
          source,
          label: 'While shielded: DMG +15%',
          kind: 'toggle',
          default: 1,
        })
        out.notes.push({
          source,
          text: 'Also lowers enemy Geo RES after Geo hits. Enemy effect, not counted.',
        })
        break
      default:
        out.notes.push({ source, text: `${r.summary}. Shown for info only.` })
    }
  }
  return out
}
