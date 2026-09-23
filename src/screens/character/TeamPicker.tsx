import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { CharacterAvatar, ElementIcon, Sheet, cn, elementColor } from '../../components'
import { getCharacter, type CharacterData } from '../../data'
import type { OwnedCharacter } from '../../db'
import { RESONANCES, type Resonance } from '../../engine/modifiers'

interface TeamPickerProps {
  characterKey: string
  teammates: string[]
  owned: OwnedCharacter[]
  active: Resonance[]
  onChange: (teammates: string[]) => void
}

/** Three teammate slots and the resonance badges they light up. */
export function TeamPicker({ characterKey, teammates, owned, active, onChange }: TeamPickerProps) {
  const [picking, setPicking] = useState<number | null>(null)
  const slots = [0, 1, 2].map((i) => (teammates[i] ? getCharacter(teammates[i]) : undefined))
  const activeIds = new Set(active.map((r) => r.id))
  const candidates = owned
    .filter((c) => c.key !== characterKey && !teammates.includes(c.key))
    .map((c) => getCharacter(c.key))
    .filter((c): c is CharacterData => !!c)
    .sort((a, b) => a.name.localeCompare(b.name))

  const setSlot = (i: number, key: string | null) => {
    const next = [...teammates]
    if (key) next[i] = key
    else next.splice(i, 1)
    onChange(next.filter(Boolean).slice(0, 3))
    setPicking(null)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {slots.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPicking(i)}
            aria-label={c ? `Teammate ${i + 1}: ${c.name}` : `Add teammate ${i + 1}`}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-line bg-surface p-2 transition active:scale-95"
          >
            {c ? (
              <CharacterAvatar character={c} size={56} />
            ) : (
              <span className="grid size-14 place-items-center rounded-2xl bg-surface-strong text-faint">
                <Plus size={22} />
              </span>
            )}
            <span className="w-full truncate text-xs font-bold text-muted">{c?.name ?? 'Add'}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Elemental resonance">
        {Object.values(RESONANCES).map((r) => {
          const on = activeIds.has(r.id)
          const color = r.elements.length === 1 ? elementColor(r.elements[0]) : 'var(--mint)'
          return (
            <span
              key={r.id}
              title={r.summary}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition',
                on ? 'shadow-[0_0_16px_-4px_currentColor]' : 'opacity-35',
              )}
              style={{
                color: on ? color : 'var(--text-faint)',
                backgroundColor: on
                  ? `color-mix(in srgb, ${color} 16%, transparent)`
                  : 'var(--surface)',
              }}
            >
              {r.elements.length === 1 && <ElementIcon element={r.elements[0]} size={12} />}
              {r.name}
            </span>
          )
        })}
      </div>
      {teammates.length < 3 && (
        <p className="text-xs text-faint">Resonance needs a full party of four.</p>
      )}

      {picking !== null && (
        <Sheet open onClose={() => setPicking(null)} title="Choose teammate">
          <ul className="space-y-0.5 pb-2">
            {slots[picking] && (
              <li>
                <button
                  type="button"
                  onClick={() => setSlot(picking, null)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-danger hover:bg-surface-strong"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-danger/10">
                    <X size={18} />
                  </span>
                  Remove {slots[picking]!.name}
                </button>
              </li>
            )}
            {candidates.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => setSlot(picking, c.key)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]"
                >
                  <CharacterAvatar character={c} size={44} />
                  <span className="flex-1 font-bold">{c.name}</span>
                  <span style={{ color: elementColor(c.element) }}>
                    <ElementIcon element={c.element} size={18} />
                  </span>
                </button>
              </li>
            ))}
            {candidates.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                Add more characters in the Roster to build a team.
              </p>
            )}
          </ul>
        </Sheet>
      )}
    </div>
  )
}
