import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  CharacterAvatar,
  LevelField,
  Sheet,
  Stars,
  Stepper,
  WeaponIcon,
} from '../../components'
import { getCharacter, getWeapon, levelCaps, weaponPassiveText } from '../../data'
import type { OwnedCharacter, OwnedWeapon } from '../../db'
import { newWeapon, removeWeapon, saveWeapon } from '../../db/roster'
import { WeaponSearchList } from './pickers'

type View = 'search' | 'form' | 'remove'

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
  const holder = existing && owned.find((c) => c.weaponId === existing.id)
  const holderData = holder && getCharacter(holder.key)

  const update = (patch: Partial<OwnedWeapon>) => setDraft((d) => d && { ...d, ...patch })

  async function save() {
    if (!draft) return
    await saveWeapon(draft)
    onClose()
  }

  async function remove() {
    if (!draft) return
    await removeWeapon(draft.id)
    onClose()
  }

  const title =
    view === 'search'
      ? 'Add weapon'
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

          {holderData && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <CharacterAvatar character={holderData} size={32} className="rounded-full" />
              Equipped by {holderData.name}
            </div>
          )}

          {existing && (
            <Button variant="ghost" block className="text-danger" onClick={() => setView('remove')}>
              Delete weapon
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
