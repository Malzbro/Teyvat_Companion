import { useMemo, useState } from 'react'
import {
  CharacterAvatar,
  Chip,
  ELEMENTS,
  ElementIcon,
  SearchInput,
  Stars,
  WeaponIcon,
  elementColor,
} from '../../components'
import {
  WEAPON_TYPES,
  characters,
  weapons,
  type CharacterData,
  type Element,
  type WeaponData,
  type WeaponType,
} from '../../data'

/**
 * Lower case, letters and digits only, with British spellings mapped to the game's:
 * "traveller cryo" finds "Traveler (Cryo)".
 */
const normal = (text: string) =>
  text
    .toLowerCase()
    .replace(/travell/g, 'travel')
    .replace(/[^a-z0-9]/g, '')

const matches = (name: string, query: string) => normal(name).includes(normal(query))

const rowClass =
  'flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]'

/** Search all characters not yet owned. */
export function CharacterSearchList({
  exclude,
  onPick,
}: {
  exclude: Set<string>
  onPick: (c: CharacterData) => void
}) {
  const [query, setQuery] = useState('')
  const [element, setElement] = useState<Element | null>(null)
  const list = useMemo(
    () =>
      characters.filter(
        (c) => !exclude.has(c.key) && matches(c.name, query) && (!element || c.element === element),
      ),
    [exclude, query, element],
  )
  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search characters" />
      <div className="flex gap-1.5">
        {ELEMENTS.map((e) => (
          <Chip
            key={e}
            selected={element === e}
            color={elementColor(e)}
            onClick={() => setElement(element === e ? null : e)}
            className="size-10 justify-center px-0"
            aria-label={e}
            style={{ color: elementColor(e) }}
          >
            <ElementIcon element={e} />
          </Chip>
        ))}
      </div>
      <ul className="space-y-0.5">
        {list.map((c) => (
          <li key={c.key}>
            <button type="button" className={rowClass} onClick={() => onPick(c)}>
              <CharacterAvatar character={c} size={48} />
              <span className="flex-1">
                <span className="block font-bold">{c.name}</span>
                <Stars count={c.rarity} />
              </span>
              <span style={{ color: elementColor(c.element) }}>
                <ElementIcon element={c.element} size={18} />
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-sm text-muted">No matches.</p>}
      </ul>
    </div>
  )
}

/** Search all weapons, optionally locked to one type. */
export function WeaponSearchList({
  type,
  onPick,
}: {
  type?: WeaponType
  onPick: (w: WeaponData) => void
}) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<WeaponType | null>(null)
  const activeType = type ?? typeFilter
  const list = useMemo(
    () =>
      weapons.filter(
        (w) => (!activeType || w.type === activeType) && w.rarity >= 3 && matches(w.name, query),
      ),
    [activeType, query],
  )
  return (
    <div className="space-y-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={type ? `Search ${type.toLowerCase()}s` : 'Search weapons'}
      />
      {!type && (
        <div className="flex flex-wrap gap-1.5">
          {WEAPON_TYPES.map((t) => (
            <Chip
              key={t}
              selected={typeFilter === t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            >
              {t}
            </Chip>
          ))}
        </div>
      )}
      <ul className="space-y-0.5">
        {list.map((w) => (
          <li key={w.key}>
            <button type="button" className={rowClass} onClick={() => onPick(w)}>
              <WeaponIcon weapon={w} size={48} />
              <span className="flex-1">
                <span className="block font-bold">{w.name}</span>
                <Stars count={w.rarity} />
              </span>
              <span className="text-xs text-faint">{w.type}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-sm text-muted">No matches.</p>}
      </ul>
    </div>
  )
}
