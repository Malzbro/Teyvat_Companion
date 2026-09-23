import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button, CharacterAvatar, ElementIcon, Sheet, cn, elementColor } from '../../components'
import { getCharacter, getWeapon, type CharacterData } from '../../data'
import { db, type Build, type OwnedCharacter, type TeamComp } from '../../db'
import { newTeamComp, removeTeamComp, saveTeamComp } from '../../db/builds'
import { setSummary } from '../../engine/setSummary'
import { ResonanceBadges } from '../character/TeamPicker'
import { partyResonances } from './party'

type Member = TeamComp['members'][number]
type View =
  | { kind: 'form' }
  | { kind: 'member'; at: number }
  | { kind: 'build'; at: number }
  | { kind: 'remove' }

interface TeamSheetProps {
  existing?: TeamComp
  owned: OwnedCharacter[]
  builds: Build[]
  onClose: () => void
}

export function TeamSheet({ existing, owned, builds, onClose }: TeamSheetProps) {
  const [name, setName] = useState(existing?.name ?? '')
  const [members, setMembers] = useState<Member[]>(existing?.members ?? [])
  const [view, setView] = useState<View>({ kind: 'form' })
  const back = () => setView({ kind: 'form' })

  const ownedKeys = new Set(owned.map((c) => c.key))
  const setMember = (at: number, m: Member | null) => {
    const next = [...members]
    if (m) next[at] = m
    else next.splice(at, 1)
    setMembers(next.filter(Boolean).slice(0, 4))
  }

  async function save() {
    const fallback = members
      .map((m) => getCharacter(m.characterKey)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(' & ')
    const team = existing
      ? { ...existing, name: name || fallback, members }
      : newTeamComp(name || fallback, members)
    await saveTeamComp(team)
    onClose()
  }

  async function remove() {
    if (existing) await removeTeamComp(existing.id)
    onClose()
  }

  const title =
    view.kind === 'member'
      ? 'Choose character'
      : view.kind === 'build'
        ? 'Choose build'
        : view.kind === 'remove'
          ? 'Delete team?'
          : existing
            ? 'Edit team'
            : 'New team'

  const backButton = (
    <button
      type="button"
      onClick={back}
      className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-bold text-muted hover:text-ink"
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
        view.kind === 'form' && (
          <Button block size="lg" onClick={save} disabled={members.length === 0}>
            {existing ? 'Save' : 'Add team'}
          </Button>
        )
      }
    >
      {view.kind === 'form' && (
        <div className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hydro gang"
              maxLength={40}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none placeholder:text-faint focus:border-accent"
            />
          </label>

          <div className="space-y-2">
            <h3 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Members</h3>
            <ul className="space-y-1.5">
              {members.map((m, i) => {
                const c = getCharacter(m.characterKey)
                if (!c) return null
                const has = ownedKeys.has(m.characterKey)
                const build = m.buildId ? builds.find((b) => b.id === m.buildId) : undefined
                return (
                  <li
                    key={m.characterKey}
                    className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2"
                  >
                    <button
                      type="button"
                      onClick={() => setView({ kind: 'member', at: i })}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <CharacterAvatar
                        character={c}
                        size={44}
                        className={cn(!has && 'opacity-40 grayscale')}
                      />
                      <span className="min-w-0 truncate font-bold">{c.name}</span>
                    </button>
                    {has ? (
                      <button
                        type="button"
                        onClick={() => setView({ kind: 'build', at: i })}
                        className="inline-flex min-h-10 max-w-[45%] items-center gap-1 rounded-full bg-surface-strong px-3 text-xs font-bold"
                      >
                        <span className={cn('truncate', build ? 'text-accent' : 'text-muted')}>
                          {build?.name ?? 'Equipped gear'}
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-faint" />
                      </button>
                    ) : (
                      <span className="px-2 text-xs text-faint">Not owned</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setMember(i, null)}
                      aria-label={`Remove ${c.name}`}
                      className="grid size-10 shrink-0 place-items-center rounded-full text-faint hover:bg-surface-strong hover:text-ink"
                    >
                      <X size={16} />
                    </button>
                  </li>
                )
              })}
              {members.length < 4 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setView({ kind: 'member', at: members.length })}
                    className="flex min-h-15 w-full items-center gap-3 rounded-2xl border border-dashed border-line p-2 text-left font-bold text-muted transition hover:bg-surface active:scale-[0.98]"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-surface-strong">
                      <Plus size={20} />
                    </span>
                    Add member ({members.length}/4)
                  </button>
                </li>
              )}
            </ul>
          </div>

          {members.length === 4 ? (
            <ResonanceBadges active={partyResonances(members.map((m) => m.characterKey))} />
          ) : (
            <p className="text-xs text-faint">Resonance shows once the team has four.</p>
          )}

          {existing && (
            <Button
              variant="ghost"
              block
              className="text-danger"
              onClick={() => setView({ kind: 'remove' })}
            >
              Delete team
            </Button>
          )}
        </div>
      )}

      {view.kind === 'member' && (
        <div className="space-y-2">
          {backButton}
          <MemberPicker
            owned={owned}
            taken={members.filter((_, i) => i !== view.at).map((m) => m.characterKey)}
            current={members[view.at]?.characterKey}
            onPick={(key) => {
              setMember(view.at, { characterKey: key, buildId: null })
              back()
            }}
          />
        </div>
      )}

      {view.kind === 'build' && members[view.at] && (
        <div className="space-y-2">
          {backButton}
          <BuildPicker
            characterKey={members[view.at].characterKey}
            builds={builds}
            current={members[view.at].buildId}
            onPick={(buildId) => {
              setMember(view.at, { ...members[view.at], buildId })
              back()
            }}
          />
        </div>
      )}

      {view.kind === 'remove' && (
        <div className="space-y-4 pb-2">
          <p className="text-muted">
            The team is deleted. Characters and their builds stay as they are.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={back}>
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

function MemberPicker({
  owned,
  taken,
  current,
  onPick,
}: {
  owned: OwnedCharacter[]
  taken: string[]
  current?: string
  onPick: (key: string) => void
}) {
  const list = owned
    .filter((c) => !taken.includes(c.key))
    .map((c) => ({ c, data: getCharacter(c.key) }))
    .filter((x): x is { c: OwnedCharacter; data: CharacterData } => !!x.data)
    .sort(
      (a, b) =>
        Number(b.c.favourite) - Number(a.c.favourite) || a.data.name.localeCompare(b.data.name),
    )
  if (!list.length)
    return (
      <p className="py-6 text-center text-sm text-muted">
        Add more characters in the Roster to build a team.
      </p>
    )
  return (
    <ul className="space-y-0.5 pb-2">
      {list.map(({ c, data }) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={() => onPick(c.key)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]',
              current === c.key && 'bg-accent/10',
            )}
          >
            <CharacterAvatar character={data} size={44} />
            <span className="flex-1 font-bold">{data.name}</span>
            <span style={{ color: elementColor(data.element) }}>
              <ElementIcon element={data.element} size={18} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function BuildPicker({
  characterKey,
  builds,
  current,
  onPick,
}: {
  characterKey: string
  builds: Build[]
  current: string | null
  onPick: (buildId: string | null) => void
}) {
  const mine = builds.filter((b) => b.characterKey === characterKey)
  const name = getCharacter(characterKey)?.name
  return (
    <div className="space-y-2 pb-2">
      <ul className="space-y-1">
        <li>
          <PickRow
            selected={current === null}
            title="Equipped gear"
            detail="Whatever they're wearing at the time"
            onClick={() => onPick(null)}
          />
        </li>
        {mine.map((b) => (
          <li key={b.id}>
            <BuildRow build={b} selected={current === b.id} onClick={() => onPick(b.id)} />
          </li>
        ))}
      </ul>
      {mine.length === 0 && (
        <p className="px-2 text-xs text-faint">
          No saved builds for {name} yet. Open {name}'s page and tap “Save current gear” to make
          one.
        </p>
      )}
    </div>
  )
}

function BuildRow({
  build,
  selected,
  onClick,
}: {
  build: Build
  selected: boolean
  onClick: () => void
}) {
  const artifacts = useArtifactSets(build)
  const weapon = useWeaponName(build.weaponId)
  return (
    <PickRow
      selected={selected}
      title={build.name}
      detail={[weapon, artifacts].filter(Boolean).join(' · ')}
      onClick={onClick}
    />
  )
}

function PickRow({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-start rounded-2xl border border-line p-3 text-left transition hover:bg-surface-strong active:scale-[0.98]',
        selected && 'border-accent/50 bg-accent/10',
      )}
    >
      <span className="font-bold">{title}</span>
      <span className="text-xs text-muted">{detail}</span>
    </button>
  )
}

// Small live lookups so rows show the build's weapon and sets.

function useArtifactSets(build: Build) {
  const ids = Object.values(build.artifactIds).filter((x): x is string => !!x)
  const pieces = useLiveQuery(() => db.artifacts.bulkGet(ids), [ids.join(',')])
  return pieces ? setSummary(pieces.map((p) => p?.setKey)) : ''
}

function useWeaponName(id: string | null) {
  const w = useLiveQuery(() => (id ? db.weapons.get(id) : undefined), [id])
  const data = w && getWeapon(w.key)
  return data ? `${data.name} R${w.refinement}` : ''
}
