import { Check, CloudDownload } from 'lucide-react'
import { useState } from 'react'
import { Button, CharacterAvatar, Sheet, cn } from '../../components'
import { ENKA_UID } from '../../config'
import { getCharacter } from '../../data'
import { applyImport, planImport, type ImportPlanItem } from '../../db/enkaImport'
import { fetchShowcase } from '../../engine/enka'

type View = 'uid' | 'review' | 'done'

const STATUS: Record<ImportPlanItem['status'], { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-mint/15 text-mint' },
  changed: { label: 'Changed', className: 'bg-accent/15 text-accent' },
  same: { label: 'Up to date', className: 'bg-surface-strong text-muted' },
}

/** Import her in-game showcase from Enka.Network, with a review before anything is saved. */
export function ImportSheet({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('uid')
  const [uid, setUid] = useState(ENKA_UID)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<ImportPlanItem[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const showcase = await fetchShowcase(uid)
      if (!showcase.characters.length)
        throw new Error(
          'No characters found. Your in-game character showcase might be hidden or empty.',
        )
      const items = await planImport(showcase.characters)
      setPlan(items)
      setSkipped(showcase.skipped)
      setChosen(new Set(items.filter((i) => i.status !== 'same').map((i) => i.incoming.key)))
      setView('review')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    setBusy(true)
    try {
      const result = await applyImport(
        plan.filter((i) => chosen.has(i.incoming.key)).map((i) => i.incoming),
      )
      setSummary(
        `Imported ${result.characters} ${result.characters === 1 ? 'character' : 'characters'}, ` +
          `${result.weaponsAdded} new ${result.weaponsAdded === 1 ? 'weapon' : 'weapons'} and ` +
          `${result.artifactsAdded} new ${result.artifactsAdded === 1 ? 'artifact' : 'artifacts'}.`,
      )
      setView('done')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (key: string) =>
    setChosen((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <Sheet
      open
      onClose={onClose}
      title={view === 'review' ? 'Choose what to import' : 'Import from the game'}
      footer={
        view === 'review' ? (
          <Button block size="lg" onClick={apply} disabled={busy || chosen.size === 0}>
            {busy ? 'Importing…' : `Import ${chosen.size} selected`}
          </Button>
        ) : view === 'done' ? (
          <Button block size="lg" onClick={onClose}>
            Done
          </Button>
        ) : undefined
      }
    >
      {view === 'uid' && (
        <div className="space-y-4 pb-2">
          <p className="text-sm text-muted">
            Brings in the characters from your in-game showcase (up to 12), with their levels,
            talents, weapon and artifacts. You'll see every change before anything is saved.
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">UID</span>
            <input
              inputMode="numeric"
              value={uid}
              onChange={(e) => setUid(e.target.value.replace(/\D/g, ''))}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base font-bold tabular-nums focus:border-accent/60 focus:outline-none"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          )}
          <Button block size="lg" onClick={load} disabled={busy || uid.length < 9}>
            <CloudDownload size={18} /> {busy ? 'Loading showcase…' : 'Load showcase'}
          </Button>
          <p className="text-xs text-faint">Data from Enka.Network.</p>
        </div>
      )}

      {view === 'review' && (
        <div className="space-y-2 pb-2">
          <ul className="space-y-2">
            {plan.map((item) => {
              const data = getCharacter(item.incoming.key)!
              const on = chosen.has(item.incoming.key)
              const status = STATUS[item.status]
              return (
                <li key={item.incoming.key}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(item.incoming.key)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]',
                      on ? 'border-accent/50 bg-accent/10' : 'border-line bg-surface',
                    )}
                  >
                    <CharacterAvatar character={data} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-bold">{data.name}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-bold',
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {item.changes.join(' · ') || 'Nothing new'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border',
                        on ? 'border-accent bg-accent text-accent-ink' : 'border-line',
                      )}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {skipped.length > 0 && (
            <p className="text-xs text-faint">Not imported: {skipped.join('; ')}.</p>
          )}
          <p className="text-xs text-faint">
            Your favourites, locks and teams are kept. Artifacts you already have aren't duplicated.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {view === 'done' && (
        <p className="pb-4 text-center text-sm text-muted" role="status">
          {summary} ✿
        </p>
      )}
    </Sheet>
  )
}
