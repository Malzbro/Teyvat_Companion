import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  CharacterAvatar,
  LevelField,
  Sheet,
  Stars,
  Stepper,
  WeaponIcon,
  cn,
} from '../../components'
import { getCharacter, getWeapon, levelCaps, weaponPassiveText } from '../../data'
import type { OwnedCharacter, OwnedWeapon } from '../../db'
import { equipWeapon, newWeapon, removeWeapon, saveWeapon } from '../../db/roster'
import { WeaponSearchList } from './pickers'

type View = 'search' | 'form' | 'equip' | 'remove'

interface WeaponSheetProps {
  /** The weapon being edited; omit to add a new one. */
  existing?: OwnedWeapon
  owned: OwnedCharacter[]
  onClose: () => void
}

export function WeaponSheet({ existing, owned, onClose }: WeaponSheetProps) {
  const [draft, setDraft] = useState<OwnedWeapon | null>(existing ?? null)
  const [view, setView] = useState<View>(existing ? 'form' : 'search')
  const data = draft && getWeapon(draft.key)
  // Who wields it. For a new weapon this is only applied when it's added.
  const [holderKey, setHolderKey] = useState<string | null>(
    (existing && owned.find((c) => c.weaponId === existing.id)?.key) ?? null,
  )
  const holderData = holderKey ? getCharacter(holderKey) : undefined

  const update = (patch: Partial<OwnedWeapon>) => setDraft((d) => d && { ...d, ...patch })

  async function save() {
    if (!draft) return
    await saveWeapon(draft)
    if (!existing && holderKey) await equipWeapon(holderKey, draft.id)
    onClose()
  }

  async function equip(characterKey: string | null) {
    if (existing) {
      if (characterKey) await equipWeapon(characterKey, existing.id)
      else if (holderKey) await equipWeapon(holderKey, null)
    }
    setHolderKey(characterKey)
    setView('form')
  }

  // Characters who can use this weapon type, favourites first.
  const wielders = owned
    .map((c) => ({ c, data: getCharacter(c.key)! }))
    .filter(({ data: d }) => d && d.weaponType === data?.type)
    .sort(
      (a, b) =>
        Number(b.c.favourite) - Number(a.c.favourite) || a.data.name.localeCompare(b.data.name),
    )

  async function remove() {
    if (!draft) return
    await removeWeapon(draft.id)
    onClose()
  }

  const title =
    view === 'search'
      ? 'Add weapon'
      : view === 'equip'
        ? 'Equip to'
        : view === 'remove'
          ? `Delete ${data?.name}?`
          : (data?.name ?? '')

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        view === 'form' && (
          <Button block size="lg" onClick={save}>
            {existing ? 'Save' : 'Add weapon'}
          </Button>
        )
      }
    >
      {view === 'search' && (
        <WeaponSearchList
          onPick={(w) => {
            setDraft(newWeapon(w.key))
            setView('form')
          }}
        />
      )}

      {view === 'form' && draft && data && (
        <div className="space-y-5">
          {!existing && (
            <button
              type="button"
              onClick={() => setView('search')}
              className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-bold text-muted hover:text-ink"
            >
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <div className="flex items-center gap-3">
            <WeaponIcon weapon={data} size={64} />
            <div className="space-y-1">
              <Stars count={data.rarity} className="flex" />
              <p className="text-sm text-muted">{data.type}</p>
            </div>
          </div>

          <LevelField
            level={draft.level}
            ascension={draft.ascension}
            caps={levelCaps(data)}
            onChange={(level, ascension) => update({ level, ascension })}
          />

          <Stepper
            label="Refinement"
            value={draft.refinement}
            onChange={(refinement) => update({ refinement })}
            min={1}
            max={5}
            format={(v) => `R${v}`}
          />

          {data.passive && (
            <div className="rounded-2xl border border-line bg-surface p-3">
              <p className="text-sm font-bold">{data.passive.name}</p>
              <p className="mt-1 text-sm text-muted">{weaponPassiveText(data, draft.refinement)}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Wielded by</h3>
            <button
              type="button"
              onClick={() => setView('equip')}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]"
            >
              {holderData ? (
                <CharacterAvatar character={holderData} size={40} className="rounded-full" />
              ) : (
                <span className="size-10 rounded-full bg-surface-strong" />
              )}
              <span className="flex-1 font-bold">{holderData?.name ?? 'Nobody'}</span>
              <ChevronRight size={18} className="text-faint" />
            </button>
          </div>

          {existing && (
            <Button variant="ghost" block className="text-danger" onClick={() => setView('remove')}>
              Delete weapon
            </Button>
          )}
        </div>
      )}

      {view === 'equip' && data && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setView('form')}
            className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-bold text-muted hover:text-ink"
          >
            <ChevronLeft size={18} /> Back
          </button>
          {wielders.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No one in the roster uses a {data.type} yet.
            </p>
          )}
          <ul className="space-y-1">
            {wielders.map(({ c, data: d }) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => equip(c.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]',
                    holderKey === c.key && 'bg-accent/10',
                  )}
                >
                  <CharacterAvatar character={d} size={44} />
                  <span className="flex-1 font-bold">{d.name}</span>
                  {c.weaponId && c.weaponId !== existing?.id && (
                    <span className="text-xs text-faint">replaces current</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {holderKey && (
            <Button variant="ghost" block onClick={() => equip(null)}>
              Unequip
            </Button>
          )}
        </div>
      )}

      {view === 'remove' && data && (
        <div className="space-y-4 pb-2">
          <p className="text-muted">
            {holderData
              ? `${holderData.name} will be left without a weapon.`
              : 'This weapon will be deleted.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setView('form')}>
              Cancel
            </Button>
            <Button variant="danger" block onClick={remove}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
