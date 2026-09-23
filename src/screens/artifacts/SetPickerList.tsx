import { useMemo, useState } from 'react'
import { SearchInput, rarityBackground } from '../../components'
import { artifactSets, iconUrl } from '../../data'

/** Searchable list of artifact sets (4★+ only; low sets aren't worth tracking). */
export function SetPickerList({
  onPick,
  highlight,
}: {
  onPick: (key: string) => void
  /** Sets to list first, e.g. ones she already has. */
  highlight?: string[]
}) {
  const [query, setQuery] = useState('')
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const first = new Set(highlight)
    return artifactSets
      .filter((s) => Math.max(...s.rarities) >= 4 && s.name.toLowerCase().includes(q))
      .sort((a, b) => Number(first.has(b.key)) - Number(first.has(a.key)))
  }, [query, highlight])

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search sets" />
      <ul className="space-y-0.5">
        {list.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onPick(s.key)}
              className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]"
            >
              <img
                src={iconUrl(s.icons.flower)}
                alt=""
                loading="lazy"
                className="size-12 rounded-xl object-contain"
                style={{ background: rarityBackground(Math.max(...s.rarities)) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{s.name}</span>
                <span className="line-clamp-1 text-xs text-muted">2pc: {s.twoPiece}</span>
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-sm text-muted">No matches.</p>}
      </ul>
    </div>
  )
}
