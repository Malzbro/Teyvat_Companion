import { useLiveQuery } from 'dexie-react-hooks'
import { Heart, Plus, Sword, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Button,
  Card,
  CharacterAvatar,
  Chip,
  ELEMENTS,
  ElementIcon,
  EmptyState,
  Segmented,
  Stars,
  WeaponIcon,
  elementColor,
} from '../../components'
import { WEAPON_TYPES, getCharacter, getWeapon, type Element, type WeaponType } from '../../data'
import { db, type OwnedCharacter, type OwnedWeapon } from '../../db'
import { PageHeader } from '../PageHeader'
import { CharacterSheet } from './CharacterSheet'
import { WeaponSheet } from './WeaponSheet'

type Tab = 'characters' | 'weapons'
type Open =
  { kind: 'character'; existing?: OwnedCharacter } | { kind: 'weapon'; existing?: OwnedWeapon }

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

export function RosterScreen() {
  const [tab, setTab] = useState<Tab>('characters')
  const [elements, setElements] = useState<Element[]>([])
  const [types, setTypes] = useState<WeaponType[]>([])
  const [open, setOpen] = useState<Open | null>(null)
  const navigate = useNavigate()
  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const weapons = useLiveQuery(() => db.weapons.toArray(), [])

  if (!owned || !weapons) return <PageHeader title="Roster" />

  const shownCharacters = owned
    .map((c) => ({ owned: c, data: getCharacter(c.key)! }))
    .filter(({ data }) => data)
    .filter(({ data }) => !elements.length || elements.includes(data.element))
    .filter(({ data }) => !types.length || types.includes(data.weaponType))
    .sort(
      (a, b) =>
        Number(b.owned.favourite) - Number(a.owned.favourite) ||
        b.data.rarity - a.data.rarity ||
        a.data.name.localeCompare(b.data.name),
    )

  const shownWeapons = weapons
    .map((w) => ({ owned: w, data: getWeapon(w.key)! }))
    .filter(({ data }) => data)
    .filter(({ data }) => !types.length || types.includes(data.type))
    .sort(
      (a, b) =>
        b.data.rarity - a.data.rarity ||
        a.data.name.localeCompare(b.data.name) ||
        b.owned.level - a.owned.level,
    )

  const isCharacters = tab === 'characters'
  const filtered = elements.length > 0 || types.length > 0

  return (
    <>
      <PageHeader
        title="Roster"
        subtitle={isCharacters ? `${owned.length} characters` : `${weapons.length} weapons`}
        action={
          <Button
            size="sm"
            onClick={() => setOpen({ kind: isCharacters ? 'character' : 'weapon' })}
            aria-label={isCharacters ? 'Add character' : 'Add weapon'}
          >
            <Plus size={16} strokeWidth={3} /> Add
          </Button>
        }
      />

      <div className="space-y-3">
        <Segmented
          label="Roster view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'characters', label: 'Characters' },
            { value: 'weapons', label: 'Weapons' },
          ]}
        />

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {isCharacters &&
            ELEMENTS.map((e) => (
              <Chip
                key={e}
                selected={elements.includes(e)}
                color={elementColor(e)}
                onClick={() => setElements(toggle(elements, e))}
                className="size-9 shrink-0 justify-center px-0"
                style={{ color: elementColor(e) }}
                aria-label={e}
              >
                <ElementIcon element={e} />
              </Chip>
            ))}
          {WEAPON_TYPES.map((t) => (
            <Chip
              key={t}
              selected={types.includes(t)}
              onClick={() => setTypes(toggle(types, t))}
              className="shrink-0"
            >
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {isCharacters ? (
          shownCharacters.length ? (
            <ul className="grid grid-cols-3 gap-2.5">
              {shownCharacters.map(({ owned: c, data }) => (
                <li key={c.key}>
                  <Card
                    element={data.element}
                    interactive
                    role="button"
                    tabIndex={0}
                    aria-label={`${data.name}, level ${c.level}, C${c.constellation}`}
                    onClick={() => navigate(`/character/${c.key}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/character/${c.key}`)
                    }}
                    className="flex flex-col items-center p-2.5 pb-3 text-center"
                  >
                    {c.favourite && (
                      <Heart
                        size={14}
                        fill="currentColor"
                        className="absolute top-2 right-2 z-10 text-accent"
                        aria-hidden
                      />
                    )}
                    <CharacterAvatar character={data} size={72} className="rounded-[1.25rem]" />
                    <p className="mt-2 w-full truncate text-sm font-bold">{data.name}</p>
                    <p className="text-xs text-muted tabular-nums">
                      Lv. {c.level} · C{c.constellation}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : filtered ? (
            <EmptyState icon={Users} title="No one matches" message="Try clearing a filter." />
          ) : (
            <EmptyState
              icon={Users}
              title="No characters yet"
              message="Add the characters you own to start planning."
              action={<Button onClick={() => setOpen({ kind: 'character' })}>Add character</Button>}
            />
          )
        ) : shownWeapons.length ? (
          <ul className="space-y-2">
            {shownWeapons.map(({ owned: w, data }) => {
              const holder = owned.find((c) => c.weaponId === w.id)
              const holderData = holder && getCharacter(holder.key)
              return (
                <li key={w.id}>
                  <Card
                    interactive
                    role="button"
                    tabIndex={0}
                    aria-label={`${data.name}, level ${w.level}, R${w.refinement}`}
                    onClick={() => setOpen({ kind: 'weapon', existing: w })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        setOpen({ kind: 'weapon', existing: w })
                    }}
                    className="flex items-center gap-3 p-2.5"
                  >
                    <WeaponIcon weapon={data} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{data.name}</p>
                      <p className="flex items-center gap-2 text-sm text-muted tabular-nums">
                        <Stars count={data.rarity} /> Lv. {w.level} · R{w.refinement}
                      </p>
                    </div>
                    {holderData && (
                      <CharacterAvatar character={holderData} size={36} className="rounded-full" />
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        ) : filtered ? (
          <EmptyState icon={Sword} title="No weapons match" message="Try clearing a filter." />
        ) : (
          <EmptyState
            icon={Sword}
            title="No weapons yet"
            message="Add weapons here, or straight from a character."
            action={<Button onClick={() => setOpen({ kind: 'weapon' })}>Add weapon</Button>}
          />
        )}
      </div>

      {open?.kind === 'character' && (
        <CharacterSheet
          existing={open.existing}
          owned={owned}
          weapons={weapons}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'weapon' && (
        <WeaponSheet existing={open.existing} owned={owned} onClose={() => setOpen(null)} />
      )}
    </>
  )
}
