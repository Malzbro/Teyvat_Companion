import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Flower2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ArtifactTile, Button, Chip, EmptyState, Sheet } from '../../components'
import { FARMED_SETS } from '../../config'
import { getArtifactSet, getCharacter, iconUrl, type ArtifactSlot, type StatKey } from '../../data'
import { STAT_SHORT } from '../../data/stats'
import { db, type Artifact } from '../../db'
import { ARTIFACT_SLOTS, SLOT_LABELS } from '../../engine/artifact'
import { PageHeader } from '../PageHeader'
import { ArtifactSheet } from './ArtifactSheet'
import { SetPickerList } from './SetPickerList'

type Open = { kind: 'artifact'; existing?: Artifact } | { kind: 'setFilter' }

export function ArtifactsScreen() {
  const artifacts = useLiveQuery(() => db.artifacts.toArray(), [])
  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const lastSet = useLiveQuery(() => db.settings.get('lastArtifactSet'), [])
  const lastRarity = useLiveQuery(() => db.settings.get('lastArtifactRarity'), [])
  const [open, setOpen] = useState<Open | null>(null)
  const [setFilter, setSetFilter] = useState<string | null>(null)
  const [slotFilter, setSlotFilter] = useState<ArtifactSlot | null>(null)
  const [mainFilter, setMainFilter] = useState<StatKey | null>(null)
  const [unequippedOnly, setUnequippedOnly] = useState(false)

  const wearerOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of owned ?? [])
      for (const id of Object.values(c.artifactIds)) if (id) map.set(id, c.key)
    return map
  }, [owned])

  if (!artifacts || !owned) return <PageHeader title="Artifacts" />

  const inventorySets = [...new Set(artifacts.map((a) => a.setKey))]
  const preferredSets = [...new Set([...inventorySets, ...FARMED_SETS])]
  const mainStats = [
    ...new Set(
      artifacts.filter((a) => !slotFilter || a.slot === slotFilter).map((a) => a.mainStat),
    ),
  ]

  const shown = artifacts
    .filter(
      (a) =>
        (!setFilter || a.setKey === setFilter) &&
        (!slotFilter || a.slot === slotFilter) &&
        (!mainFilter || a.mainStat === mainFilter) &&
        (!unequippedOnly || !wearerOf.has(a.id)),
    )
    .sort(
      (a, b) =>
        ARTIFACT_SLOTS.indexOf(a.slot) - ARTIFACT_SLOTS.indexOf(b.slot) ||
        b.rarity - a.rarity ||
        b.level - a.level ||
        a.setKey.localeCompare(b.setKey),
    )

  const filtered = !!(setFilter || slotFilter || mainFilter || unequippedOnly)
  const filterSet = setFilter ? getArtifactSet(setFilter) : undefined
  const addArtifact = () => setOpen({ kind: 'artifact' })

  return (
    <>
      <PageHeader
        title="Artifacts"
        subtitle={
          filtered ? `${shown.length} of ${artifacts.length}` : `${artifacts.length} artifacts`
        }
        action={
          <Button size="sm" onClick={addArtifact} aria-label="Add artifact">
            <Plus size={16} strokeWidth={3} /> Add
          </Button>
        }
      />

      {artifacts.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex gap-1.5">
            <Chip
              selected={!!setFilter}
              onClick={() => setOpen({ kind: 'setFilter' })}
              className="min-w-0 flex-1 justify-between"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {filterSet && (
                  <img src={iconUrl(filterSet.icons.flower)} alt="" className="size-5 shrink-0" />
                )}
                <span className="truncate">{filterSet?.name ?? 'All sets'}</span>
              </span>
              <ChevronDown size={16} className="shrink-0" />
            </Chip>
            <Chip selected={unequippedOnly} onClick={() => setUnequippedOnly(!unequippedOnly)}>
              Not equipped
            </Chip>
          </div>

          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Filter by slot">
            {ARTIFACT_SLOTS.map((s) => (
              <Chip
                key={s}
                selected={slotFilter === s}
                onClick={() => {
                  setSlotFilter(slotFilter === s ? null : s)
                  setMainFilter(null)
                }}
                className="justify-center px-0 text-xs"
              >
                {SLOT_LABELS[s]}
              </Chip>
            ))}
          </div>

          {mainStats.length > 1 && (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {mainStats.map((k) => (
                <Chip
                  key={k}
                  selected={mainFilter === k}
                  onClick={() => setMainFilter(mainFilter === k ? null : k)}
                  className="min-h-8 shrink-0 px-3 text-xs"
                >
                  {STAT_SHORT[k]}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {shown.length > 0 ? (
          <ul className="grid grid-cols-4 gap-2 min-[420px]:grid-cols-5">
            {shown.map((a) => {
              const set = getArtifactSet(a.setKey)
              const wearerKey = wearerOf.get(a.id)
              if (!set) return null
              return (
                <li key={a.id}>
                  <ArtifactTile
                    artifact={a}
                    set={set}
                    wearer={wearerKey ? getCharacter(wearerKey) : undefined}
                    onClick={() => setOpen({ kind: 'artifact', existing: a })}
                    className="w-full"
                  />
                </li>
              )
            })}
          </ul>
        ) : filtered ? (
          <EmptyState icon={Flower2} title="Nothing matches" message="Try clearing a filter." />
        ) : (
          <EmptyState
            icon={Flower2}
            title="No artifacts yet"
            message="Add your artifacts in a few taps. The set you used last is remembered."
            action={<Button onClick={addArtifact}>Add artifact</Button>}
          />
        )}
      </div>

      {open?.kind === 'artifact' && (
        <ArtifactSheet
          existing={open.existing}
          owned={owned}
          lastSetKey={(lastSet?.value as string | undefined) ?? null}
          lastRarity={(lastRarity?.value as number | undefined) ?? 5}
          preferredSets={preferredSets}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'setFilter' && (
        <Sheet open onClose={() => setOpen(null)} title="Filter by set">
          {setFilter && (
            <Button
              variant="secondary"
              block
              className="mb-3"
              onClick={() => {
                setSetFilter(null)
                setOpen(null)
              }}
            >
              Show all sets
            </Button>
          )}
          <SetPickerList
            highlight={inventorySets}
            onPick={(key) => {
              setSetFilter(key)
              setOpen(null)
            }}
          />
        </Sheet>
      )}
    </>
  )
}
