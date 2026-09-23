import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Button,
  CharacterAvatar,
  Chip,
  Sheet,
  Stepper,
  cn,
  rarityBackground,
} from '../../components'
import { getArtifactSet, getCharacter, iconUrl, type ArtifactSlot, type StatKey } from '../../data'
import {
  STAT_LABELS,
  STAT_SHORT,
  formatStat,
  fromDisplay,
  isPercent,
  toDisplay,
} from '../../data/stats'
import { newId, type Artifact, type OwnedCharacter } from '../../db'
import { equipArtifact, removeArtifact, saveArtifact, setSetting } from '../../db/artifacts'
import {
  ARTIFACT_SLOTS,
  SLOT_LABELS,
  allowedMainStats,
  artifactStats,
  mainStatValue,
  maxArtifactLevel,
  validateArtifact,
} from '../../engine/artifact'
import { SetPickerList } from './SetPickerList'

type View = 'form' | 'set' | 'equip' | 'remove'

interface ArtifactSheetProps {
  existing?: Artifact
  owned: OwnedCharacter[]
  /** Last-used set and rarity, remembered between adds. */
  lastSetKey: string | null
  lastRarity: number
  /** Set keys to list first in the set picker. */
  preferredSets: string[]
  onClose: () => void
}

interface SubDraft {
  key: StatKey
  text: string
}

const autoMain = (slot: ArtifactSlot): StatKey | null => {
  const allowed = allowedMainStats(slot)
  return allowed.length === 1 ? allowed[0] : null
}

export function ArtifactSheet({
  existing,
  owned,
  lastSetKey,
  lastRarity,
  preferredSets,
  onClose,
}: ArtifactSheetProps) {
  const [view, setView] = useState<View>(existing || lastSetKey ? 'form' : 'set')
  const [setKey, setSetKey] = useState<string | null>(existing?.setKey ?? lastSetKey)
  const [rarity, setRarity] = useState(existing?.rarity ?? lastRarity)
  const [slot, setSlot] = useState<ArtifactSlot>(existing?.slot ?? 'flower')
  const [level, setLevel] = useState(existing?.level ?? maxArtifactLevel(lastRarity))
  const [mainStat, setMainStat] = useState<StatKey | null>(existing?.mainStat ?? autoMain('flower'))
  const [subs, setSubs] = useState<SubDraft[]>(
    existing?.substats.map((s) => ({ key: s.key, text: toDisplay(s.key, s.value) })) ?? [],
  )
  const [errors, setErrors] = useState<string[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const inputs = useRef<Partial<Record<StatKey, HTMLInputElement | null>>>({})
  const [focusKey, setFocusKey] = useState<{ key: StatKey } | null>(null)

  // Focus a substat value box right after its chip is tapped.
  useEffect(() => {
    if (focusKey) inputs.current[focusKey.key]?.focus()
  }, [focusKey])

  const set = setKey ? getArtifactSet(setKey) : undefined
  const maxLevel = maxArtifactLevel(rarity)
  const wearer = existing && owned.find((c) => c.artifactIds[existing.slot] === existing.id)
  const wearerData = wearer && getCharacter(wearer.key)

  function pickSet(key: string) {
    const s = getArtifactSet(key)!
    setSetKey(key)
    if (!s.rarities.includes(rarity)) {
      const r = Math.max(...s.rarities)
      setRarity(r)
      setLevel(maxArtifactLevel(r))
    }
    setView('form')
  }

  function pickSlot(s: ArtifactSlot) {
    setSlot(s)
    const main = mainStat && allowedMainStats(s).includes(mainStat) ? mainStat : autoMain(s)
    pickMain(main)
  }

  function pickMain(key: StatKey | null) {
    setMainStat(key)
    if (key) setSubs((cur) => cur.filter((s) => s.key !== key))
  }

  function toggleSub(key: StatKey) {
    if (subs.some((s) => s.key === key)) setSubs(subs.filter((s) => s.key !== key))
    else if (subs.length < 4) {
      setSubs([...subs, { key, text: '' }])
      setFocusKey({ key })
    }
  }

  function build(): Artifact | null {
    const problems: string[] = []
    if (!set) problems.push('Pick an artifact set.')
    if (!mainStat) problems.push('Pick a main stat.')
    const substats = subs.map((s) => ({ key: s.key, value: fromDisplay(s.key, s.text) }))
    for (const s of substats)
      if (s.value === null) problems.push(`Enter a value for ${STAT_LABELS[s.key]}.`)
    if (problems.length) {
      setErrors(problems)
      return null
    }
    const artifact: Artifact = {
      id: existing?.id ?? newId(),
      setKey: setKey!,
      slot,
      rarity,
      level,
      mainStat: mainStat!,
      substats: substats as Artifact['substats'],
    }
    const invalid = validateArtifact(artifact)
    setErrors(invalid)
    return invalid.length ? null : artifact
  }

  async function save(next: boolean) {
    const artifact = build()
    if (!artifact) return
    try {
      await saveArtifact(artifact)
    } catch (e) {
      setErrors([(e as Error).message])
      return
    }
    await setSetting('lastArtifactSet', artifact.setKey)
    await setSetting('lastArtifactRarity', artifact.rarity)
    if (!next) return onClose()
    // Keep set, rarity and level; move on to the next slot.
    const nextSlot = ARTIFACT_SLOTS[(ARTIFACT_SLOTS.indexOf(slot) + 1) % ARTIFACT_SLOTS.length]
    setSlot(nextSlot)
    setMainStat(autoMain(nextSlot))
    setSubs([])
    setErrors([])
    setSavedCount((n) => n + 1)
  }

  async function equip(characterKey: string | null) {
    if (!existing) return
    await equipArtifact(characterKey, existing.id)
    setView('form')
  }

  const title =
    view === 'set'
      ? 'Choose set'
      : view === 'equip'
        ? 'Equip to'
        : view === 'remove'
          ? 'Delete artifact?'
          : existing
            ? 'Edit artifact'
            : 'Add artifact'

  const sectionTitle = 'text-xs font-bold tracking-[0.18em] text-muted uppercase'
  const back = (
    <button
      type="button"
      onClick={() => setView('form')}
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
            {errors.length > 0 && (
              <ul
                className="space-y-1 rounded-2xl bg-danger/10 p-3 text-sm text-danger"
                role="alert"
              >
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {savedCount > 0 && errors.length === 0 && (
              <p className="text-center text-sm font-semibold text-mint" role="status">
                Saved {savedCount} {savedCount === 1 ? 'artifact' : 'artifacts'} ✿ Next:{' '}
                {SLOT_LABELS[slot].toLowerCase()}
              </p>
            )}
            <div className="flex gap-2">
              {!existing && (
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => save(true)}>
                  Save & next
                </Button>
              )}
              <Button size="lg" className="flex-1" onClick={() => save(false)}>
                {existing ? 'Save' : 'Save & close'}
              </Button>
            </div>
          </div>
        )
      }
    >
      {view === 'set' && (
        <div>
          {setKey && back}
          <SetPickerList onPick={pickSet} highlight={preferredSets} />
        </div>
      )}

      {view === 'form' && (
        <div className="space-y-5">
          {/* Set + rarity */}
          <button
            type="button"
            onClick={() => setView('set')}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]"
          >
            {set && (
              <img
                src={iconUrl(set.icons.flower)}
                alt=""
                className="size-12 rounded-xl object-contain"
                style={{ background: rarityBackground(rarity) }}
              />
            )}
            <span className="flex-1">
              <span className="block font-bold">{set?.name ?? 'Choose a set'}</span>
              <span className="text-sm text-muted">Tap to change</span>
            </span>
            <ChevronRight size={18} className="text-faint" />
          </button>

          {set && set.rarities.length > 1 && (
            <div className="flex gap-1.5">
              {[...set.rarities]
                .filter((r) => artifactStats.rarities.includes(r))
                .sort((a, b) => b - a)
                .map((r) => (
                  <Chip
                    key={r}
                    selected={rarity === r}
                    onClick={() => {
                      setRarity(r)
                      setLevel(Math.min(level, maxArtifactLevel(r)))
                    }}
                  >
                    {r}★
                  </Chip>
                ))}
            </div>
          )}

          {/* Slot */}
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Slot">
            {ARTIFACT_SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={slot === s}
                aria-label={SLOT_LABELS[s]}
                onClick={() => pickSlot(s)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border p-1.5 transition active:scale-95',
                  slot === s ? 'border-accent/70 bg-accent/15' : 'border-line bg-surface',
                )}
              >
                {set && (
                  <img src={iconUrl(set.icons[s])} alt="" className="size-10 object-contain" />
                )}
                <span className="text-[11px] font-bold text-muted">{SLOT_LABELS[s]}</span>
              </button>
            ))}
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Stepper
              label="Level"
              value={level}
              onChange={setLevel}
              min={0}
              max={maxLevel}
              format={(v) => `+${v}`}
            />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: maxLevel / 4 + 1 }, (_, i) => i * 4).map((l) => (
                <Chip
                  key={l}
                  selected={level === l}
                  onClick={() => setLevel(l)}
                  className="min-h-8 px-3"
                >
                  +{l}
                </Chip>
              ))}
            </div>
          </div>

          {/* Main stat */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className={sectionTitle}>Main stat</h3>
              {mainStat && (
                <span className="text-sm font-bold text-accent tabular-nums">
                  {STAT_LABELS[mainStat]}{' '}
                  {formatStat(mainStat, mainStatValue(rarity, mainStat, level))}
                </span>
              )}
            </div>
            {allowedMainStats(slot).length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {allowedMainStats(slot).map((k) => (
                  <Chip key={k} selected={mainStat === k} onClick={() => pickMain(k)}>
                    {STAT_SHORT[k]}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {/* Substats */}
          <div className="space-y-2">
            <h3 className={sectionTitle}>Substats ({subs.length}/4)</h3>
            <div className="flex flex-wrap gap-1.5">
              {artifactStats.substatKeys
                .filter((k) => k !== mainStat)
                .map((k) => {
                  const picked = subs.some((s) => s.key === k)
                  return (
                    <Chip
                      key={k}
                      selected={picked}
                      disabled={!picked && subs.length >= 4}
                      onClick={() => toggleSub(k)}
                      className="disabled:opacity-40"
                    >
                      {STAT_SHORT[k]}
                    </Chip>
                  )
                })}
            </div>
            <div className="space-y-2 pt-1">
              {subs.map((s, i) => {
                const tiers = artifactStats.subTiers[rarity]?.[s.key] ?? []
                const maxTier = tiers.at(-1)
                return (
                  <label
                    key={s.key}
                    className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-3 focus-within:border-accent/60"
                  >
                    <span className="flex-1 text-sm font-semibold">{STAT_LABELS[s.key]}</span>
                    <input
                      ref={(el) => {
                        inputs.current[s.key] = el
                      }}
                      inputMode="decimal"
                      enterKeyHint={i === subs.length - 1 ? 'done' : 'next'}
                      value={s.text}
                      placeholder={maxTier !== undefined ? toDisplay(s.key, maxTier) : ''}
                      onChange={(e) =>
                        setSubs(
                          subs.map((x) => (x.key === s.key ? { ...x, text: e.target.value } : x)),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') inputs.current[subs[i + 1]?.key]?.focus()
                      }}
                      aria-label={`${STAT_LABELS[s.key]} value`}
                      className="w-20 bg-transparent text-right text-base font-bold tabular-nums placeholder:font-normal placeholder:text-faint focus:outline-none"
                    />
                    <span className="w-4 text-sm text-muted">{isPercent(s.key) ? '%' : ''}</span>
                    <button
                      type="button"
                      onClick={() => toggleSub(s.key)}
                      className="grid size-8 place-items-center rounded-full text-faint hover:text-ink"
                      aria-label={`Remove ${STAT_LABELS[s.key]}`}
                    >
                      <X size={16} />
                    </button>
                  </label>
                )
              })}
            </div>
          </div>

          {existing && (
            <div className="space-y-2">
              <h3 className={sectionTitle}>Worn by</h3>
              <button
                type="button"
                onClick={() => setView('equip')}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]"
              >
                {wearerData ? (
                  <CharacterAvatar character={wearerData} size={40} className="rounded-full" />
                ) : (
                  <span className="size-10 rounded-full bg-surface-strong" />
                )}
                <span className="flex-1 font-bold">{wearerData?.name ?? 'Nobody'}</span>
                <ChevronRight size={18} className="text-faint" />
              </button>
              <Button
                variant="ghost"
                block
                className="text-danger"
                onClick={() => setView('remove')}
              >
                Delete artifact
              </Button>
            </div>
          )}
        </div>
      )}

      {view === 'equip' && existing && (
        <div className="space-y-2">
          {back}
          {owned.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              Add characters in the Roster first.
            </p>
          )}
          <ul className="space-y-1">
            {owned
              .map((c) => ({ c, data: getCharacter(c.key)! }))
              .filter(({ data }) => data)
              .sort(
                (a, b) =>
                  Number(b.c.favourite) - Number(a.c.favourite) ||
                  a.data.name.localeCompare(b.data.name),
              )
              .map(({ c, data }) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => equip(c.key)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]',
                      wearer?.key === c.key && 'bg-accent/10',
                    )}
                  >
                    <CharacterAvatar character={data} size={44} />
                    <span className="flex-1 font-bold">{data.name}</span>
                    {c.artifactIds[existing.slot] &&
                      c.artifactIds[existing.slot] !== existing.id && (
                        <span className="text-xs text-faint">replaces current</span>
                      )}
                  </button>
                </li>
              ))}
          </ul>
          {wearer && (
            <Button variant="ghost" block onClick={() => equip(null)}>
              Unequip
            </Button>
          )}
        </div>
      )}

      {view === 'remove' && existing && (
        <div className="space-y-4 pb-2">
          <p className="text-muted">
            {wearerData
              ? `This artifact will be deleted and taken off ${wearerData.name}.`
              : 'This artifact will be deleted.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setView('form')}>
              Cancel
            </Button>
            <Button
              variant="danger"
              block
              onClick={async () => {
                await removeArtifact(existing.id)
                onClose()
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
