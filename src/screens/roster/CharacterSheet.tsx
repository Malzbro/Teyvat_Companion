import { ChevronLeft, ChevronRight, Heart, Plus, Sword } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  CharacterAvatar,
  ElementBadge,
  LevelField,
  Sheet,
  Stars,
  Stepper,
  WeaponIcon,
  cn,
} from '../../components'
import { MAX_LEVEL, getCharacter, getWeapon, levelCaps } from '../../data'
import type { OwnedCharacter, OwnedWeapon } from '../../db'
import {
  equipWeapon,
  newCharacter,
  newWeapon,
  removeCharacter,
  saveCharacter,
  saveWeapon,
} from '../../db/roster'
import { CharacterSearchList, WeaponSearchList } from './pickers'

type View = 'search' | 'form' | 'weapon' | 'newWeapon' | 'remove'

interface CharacterSheetProps {
  /** The character being edited; omit to add a new one. */
  existing?: OwnedCharacter
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  onClose: () => void
}

export function CharacterSheet({ existing, owned, weapons, onClose }: CharacterSheetProps) {
  const [draft, setDraft] = useState<OwnedCharacter | null>(existing ?? null)
  const [view, setView] = useState<View>(existing ? 'form' : 'search')
  const [error, setError] = useState('')
  const data = draft && getCharacter(draft.key)

  const update = (patch: Partial<OwnedCharacter>) => setDraft((d) => d && { ...d, ...patch })

  async function save() {
    if (!draft) return
    try {
      await saveCharacter({ ...draft, weaponId: existing?.weaponId ?? null })
      if (draft.weaponId !== (existing?.weaponId ?? null))
        await equipWeapon(draft.key, draft.weaponId)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function remove() {
    if (!draft) return
    await removeCharacter(draft.key)
    onClose()
  }

  async function addWeapon(key: string) {
    const weapon = newWeapon(key)
    await saveWeapon(weapon)
    update({ weaponId: weapon.id })
    setView('form')
  }

  const title =
    view === 'search'
      ? 'Add character'
      : view === 'weapon'
        ? 'Choose weapon'
        : view === 'newWeapon'
          ? `New ${data?.weaponType.toLowerCase()}`
          : view === 'remove'
            ? `Remove ${data?.name}?`
            : (data?.name ?? '')

  const back = (to: View) => (
    <button
      type="button"
      onClick={() => setView(to)}
      className="mb-3 inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-bold text-muted hover:text-ink"
    >
      <ChevronLeft size={18} /> Back
    </button>
  )

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        view === 'form' && (
          <div className="space-y-2">
            {error && <p className="text-center text-sm text-danger">{error}</p>}
            <Button block size="lg" onClick={save}>
              {existing ? 'Save' : 'Add to roster'}
            </Button>
          </div>
        )
      }
    >
      {view === 'search' && (
        <CharacterSearchList
          exclude={new Set(owned.map((c) => c.key))}
          onPick={(c) => {
            setDraft(newCharacter(c.key))
            setView('form')
          }}
        />
      )}

      {view === 'form' && draft && data && (
        <div className="space-y-5">
          {!existing && back('search')}
          <div className="flex items-center gap-3">
            <CharacterAvatar character={data} size={64} />
            <div className="flex-1 space-y-1">
              <ElementBadge element={data.element} />
              <Stars count={data.rarity} className="flex" />
            </div>
            <button
              type="button"
              onClick={() => update({ favourite: !draft.favourite })}
              aria-pressed={draft.favourite}
              aria-label="Favourite"
              className={cn(
                'grid size-12 place-items-center rounded-full transition active:scale-90',
                draft.favourite ? 'bg-accent/20 text-accent' : 'text-faint hover:text-muted',
              )}
            >
              <Heart size={22} fill={draft.favourite ? 'currentColor' : 'none'} />
            </button>
          </div>

          <LevelField
            level={draft.level}
            ascension={draft.ascension}
            caps={levelCaps(data)}
            maxLevel={MAX_LEVEL}
            onChange={(level, ascension) => update({ level, ascension })}
          />

          <Stepper
            label="Constellation"
            value={draft.constellation}
            onChange={(constellation) => update({ constellation })}
            min={0}
            max={6}
            format={(v) => `C${v}`}
          />

          <div className="space-y-2.5">
            <h3 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Talents</h3>
            {(
              [
                ['normal', 'Normal Attack'],
                ['skill', 'Elemental Skill'],
                ['burst', 'Elemental Burst'],
              ] as const
            ).map(([k, label]) => (
              <Stepper
                key={k}
                label={label}
                value={draft.talents[k]}
                onChange={(v) => update({ talents: { ...draft.talents, [k]: v } })}
                min={1}
                max={10}
              />
            ))}
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Weapon</h3>
            <WeaponRow
              weapon={weapons.find((w) => w.id === draft.weaponId)}
              onClick={() => setView('weapon')}
            />
          </div>

          {existing && (
            <Button variant="ghost" block className="text-danger" onClick={() => setView('remove')}>
              Remove from roster
            </Button>
          )}
        </div>
      )}

      {view === 'weapon' && draft && data && (
        <div className="space-y-3">
          {back('form')}
          <ul className="space-y-1.5">
            {weapons
              .filter((w) => getWeapon(w.key)?.type === data.weaponType)
              .sort(
                (a, b) => getWeapon(b.key)!.rarity - getWeapon(a.key)!.rarity || b.level - a.level,
              )
              .map((w) => {
                const holder = owned.find((c) => c.weaponId === w.id && c.key !== draft.key)
                return (
                  <li key={w.id}>
                    <WeaponRow
                      weapon={w}
                      selected={w.id === draft.weaponId}
                      note={holder ? `On ${getCharacter(holder.key)?.name}` : undefined}
                      onClick={() => {
                        update({ weaponId: w.id })
                        setView('form')
                      }}
                    />
                  </li>
                )
              })}
          </ul>
          <Button variant="secondary" block onClick={() => setView('newWeapon')}>
            <Plus size={18} /> Add a new {data.weaponType.toLowerCase()}
          </Button>
          {draft.weaponId && (
            <Button
              variant="ghost"
              block
              onClick={() => {
                update({ weaponId: null })
                setView('form')
              }}
            >
              Unequip
            </Button>
          )}
        </div>
      )}

      {view === 'newWeapon' && data && (
        <div>
          {back('weapon')}
          <WeaponSearchList type={data.weaponType} onPick={(w) => addWeapon(w.key)} />
        </div>
      )}

      {view === 'remove' && data && (
        <div className="space-y-4 pb-2">
          <p className="text-muted">
            {data.name} will be removed from the roster, along with their team and goals. The
            equipped weapon and artifacts stay in your inventory.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setView('form')}>
              Cancel
            </Button>
            <Button variant="danger" block onClick={remove}>
              Remove
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function WeaponRow({
  weapon,
  selected,
  note,
  onClick,
}: {
  weapon?: OwnedWeapon
  selected?: boolean
  note?: string
  onClick: () => void
}) {
  const data = weapon && getWeapon(weapon.key)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition active:scale-[0.98]',
        selected
          ? 'border-accent/60 bg-accent/10'
          : 'border-line bg-surface hover:bg-surface-strong',
      )}
    >
      {data ? (
        <WeaponIcon weapon={data} size={48} />
      ) : (
        <span className="grid size-12 place-items-center rounded-2xl bg-surface-strong text-faint">
          <Sword size={20} />
        </span>
      )}
      <span className="flex-1">
        <span className="block font-bold">{data?.name ?? 'No weapon'}</span>
        <span className="text-sm text-muted">
          {weapon ? `Lv. ${weapon.level} · R${weapon.refinement}` : 'Tap to choose'}
          {note && <span className="text-faint"> · {note}</span>}
        </span>
      </span>
      <ChevronRight size={18} className="text-faint" />
    </button>
  )
}
