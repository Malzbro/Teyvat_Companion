import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Check, ExternalLink, Plus, TriangleAlert, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, CharacterAvatar, Chip, EmptyState, Segmented, cn } from '../../components'
import { getCharacter } from '../../data'
import { suggestTeams } from '../../data/teamGuides'
import { db, type Build, type OwnedCharacter, type TeamComp } from '../../db'
import { applyTeamComp, isWearing, newTeamComp, saveTeamComp, teamClashes } from '../../db/builds'
import { ResonanceBadges } from '../character/TeamPicker'
import { PageHeader } from '../PageHeader'
import { partyResonances } from './party'
import { TeamSheet } from './TeamSheet'

type Tab = 'mine' | 'guides'

export function TeamsScreen() {
  const [tab, setTab] = useState<Tab>('mine')
  const [open, setOpen] = useState<{ existing?: TeamComp } | null>(null)
  const teams = useLiveQuery(() => db.teamComps.toArray(), [])
  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const builds = useLiveQuery(() => db.builds.toArray(), [])

  if (!teams || !owned || !builds) return <PageHeader title="Teams" />
  const sorted = [...teams].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const addTeam = () => setOpen({})

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle={`${teams.length} ${teams.length === 1 ? 'team' : 'teams'}`}
        action={
          <Button size="sm" onClick={addTeam} aria-label="New team">
            <Plus size={16} strokeWidth={3} /> Add
          </Button>
        }
      />

      <Segmented
        label="Teams"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mine', label: 'My teams' },
          { value: 'guides', label: 'From guides' },
        ]}
      />

      <div className="mt-4">
        {tab === 'mine' ? (
          sorted.length ? (
            <ul className="space-y-3">
              {sorted.map((t) => (
                <li key={t.id}>
                  <TeamCard
                    team={t}
                    owned={owned}
                    builds={builds}
                    onEdit={() => setOpen({ existing: t })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={UsersRound}
              title="No teams yet"
              message="Make a team of four, pick which build each one uses, and switch between teams in one tap. The same character can be in as many teams as you like."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={addTeam}>Make a team</Button>
                  <Button variant="secondary" onClick={() => setTab('guides')}>
                    See guide teams
                  </Button>
                </div>
              }
            />
          )
        ) : (
          <GuideTeams owned={owned} teams={teams} />
        )}
      </div>

      {open && (
        <TeamSheet
          existing={open.existing}
          owned={owned}
          builds={builds}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}

function TeamCard({
  team,
  owned,
  builds,
  onEdit,
}: {
  team: TeamComp
  owned: OwnedCharacter[]
  builds: Build[]
  onEdit: () => void
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const keys = team.members.map((m) => m.characterKey)
  const clashes = teamClashes(team, builds, owned)
  const ownedKeys = new Set(owned.map((c) => c.key))
  // Already in use when everyone wears their chosen build.
  const inUse = team.members.every((m) => {
    const c = owned.find((x) => x.key === m.characterKey)
    const b = m.buildId ? builds.find((x) => x.id === m.buildId) : undefined
    return !c || !b || isWearing(c, b)
  })

  async function use() {
    setState('busy')
    try {
      await applyTeamComp(team)
      setState('done')
    } catch {
      setState('idle')
    }
  }

  return (
    <Card className="space-y-3">
      <button type="button" onClick={onEdit} className="block w-full space-y-3 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate font-display text-lg font-semibold">{team.name}</p>
          {team.source && <p className="shrink-0 text-[11px] text-faint">{team.source}</p>}
        </div>
        <MemberRow members={team.members} builds={builds} ownedKeys={ownedKeys} />
      </button>
      <ResonanceBadges active={partyResonances(keys)} onlyActive />
      {clashes.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          <TriangleAlert size={14} className="mt-px shrink-0" />
          {clashes.map(([a, b]) => `${a} & ${b}`).join(', ')} share gear in their builds — only one
          can wear it at a time.
        </p>
      )}
      <Button
        block
        variant={inUse || state === 'done' ? 'secondary' : 'primary'}
        onClick={use}
        disabled={state === 'busy'}
      >
        {state === 'busy' ? (
          'Equipping…'
        ) : state === 'done' ? (
          <>
            <Check size={16} /> Team ready
          </>
        ) : (
          'Use this team'
        )}
      </Button>
    </Card>
  )
}

/** Four avatars with the build each one uses underneath. */
function MemberRow({
  members,
  builds,
  ownedKeys,
  showBuilds = true,
}: {
  members: { characterKey: string; buildId: string | null }[]
  builds: Build[]
  ownedKeys: Set<string>
  /** Off for guide teams: only "Not owned" is shown. */
  showBuilds?: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[0, 1, 2, 3].map((i) => {
        const m = members[i]
        const c = m && getCharacter(m.characterKey)
        const build = m?.buildId ? builds.find((b) => b.id === m.buildId) : undefined
        const has = m && ownedKeys.has(m.characterKey)
        return (
          <div key={i} className="flex min-w-0 flex-col items-center gap-1">
            {c ? (
              <CharacterAvatar
                character={c}
                size={60}
                className={cn(!has && 'opacity-40 grayscale')}
              />
            ) : (
              <span className="size-15 rounded-2xl border border-dashed border-line" />
            )}
            <span className="w-full truncate text-center text-xs font-bold">{c?.name ?? ''}</span>
            {c && (showBuilds || !has) && (
              <span
                className={cn(
                  'w-full truncate text-center text-[10px]',
                  build ? 'text-accent' : 'text-faint',
                )}
              >
                {!has ? 'Not owned' : (build?.name ?? 'Equipped gear')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function GuideTeams({ owned, teams }: { owned: OwnedCharacter[]; teams: TeamComp[] }) {
  const [showAll, setShowAll] = useState(false)
  const ownedKeys = new Set(owned.map((c) => c.key))
  const suggestions = suggestTeams(ownedKeys, showAll ? 1 : 3)
  const saved = new Set(
    teams.map((t) =>
      t.members
        .map((m) => m.characterKey)
        .sort()
        .join('|'),
    ),
  )

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-sm text-muted">
        <BookOpen size={16} className="mt-0.5 shrink-0 text-accent" />
        Teams recommended in the KQM (Keqing Mains) guides for your characters. Where a guide gives
        options, your own character is picked.
      </p>
      <div className="flex gap-1.5">
        <Chip selected={!showAll} onClick={() => setShowAll(false)}>
          You own 3+
        </Chip>
        <Chip selected={showAll} onClick={() => setShowAll(true)}>
          Show all
        </Chip>
      </div>
      {suggestions.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No close matches yet"
          message="Add more characters in the Roster, or tap Show all."
        />
      )}
      <ul className="space-y-3">
        {suggestions.map(({ team, members, ownedCount }) => {
          const id = [...members].sort().join('|')
          const isSaved = saved.has(id)
          const alts = team.slots
            .map((alts) => alts.filter((k) => !members.includes(k)))
            .flat()
            .map((k) => getCharacter(k)?.name)
            .filter(Boolean)
          return (
            <li key={`${team.guide}-${id}`}>
              <Card className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold">{team.name}</p>
                    <a
                      href={team.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted underline-offset-2 hover:underline"
                    >
                      {team.guide} <ExternalLink size={11} />
                    </a>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                      ownedCount === 4 ? 'bg-mint/15 text-mint' : 'bg-surface-strong text-muted',
                    )}
                  >
                    {ownedCount}/4 owned
                  </span>
                </div>
                <MemberRow
                  members={members.map((characterKey) => ({ characterKey, buildId: null }))}
                  builds={[]}
                  ownedKeys={ownedKeys}
                  showBuilds={false}
                />
                {alts.length > 0 && (
                  <p className="text-xs text-faint">Also works: {alts.join(', ')}</p>
                )}
                <ResonanceBadges active={partyResonances(members)} onlyActive />
                <Button
                  block
                  variant={isSaved ? 'secondary' : 'primary'}
                  disabled={isSaved}
                  onClick={() =>
                    saveTeamComp(
                      newTeamComp(
                        team.name,
                        members.map((characterKey) => ({ characterKey, buildId: null })),
                        team.guide,
                      ),
                    )
                  }
                >
                  {isSaved ? (
                    <>
                      <Check size={16} /> In your teams
                    </>
                  ) : (
                    'Add to my teams'
                  )}
                </Button>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
