import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Plus, Target, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Button,
  Card,
  CharacterAvatar,
  CountField,
  cn,
  EmptyState,
  ProgressBar,
  Segmented,
  rarityBackground,
} from '../../components'
import { getCharacter, getMaterial, iconUrl, type MaterialData } from '../../data'
import { db, type Goal, type OwnedCharacter, type TeamComp } from '../../db'
import { RESIN_PER_DAY, WORLD_LEVEL } from '../../config'
import { resinEstimate } from '../../engine/farming'
import { setMaterialCount } from '../../db/goals'
import {
  MATERIAL_GROUPS,
  characterExpItems,
  expOwned,
  groupOf,
  needsFor,
  progress,
  sumNeeds,
  type Needs,
  weaponExpItems,
} from '../../engine/materials'
import { PageHeader } from '../PageHeader'
import { GoalSheet } from './GoalSheet'
import { talentText } from '../../engine/talents'

type Open = { existing?: Goal }

type View = 'all' | 'team' | 'character'

export function MaterialsScreen() {
  const goals = useLiveQuery(() => db.goals.orderBy('characterKey').toArray(), [])
  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const weapons = useLiveQuery(() => db.weapons.toArray(), [])
  const teams = useLiveQuery(() => db.teamComps.toArray(), [])
  const counts = useLiveQuery(
    async () => new Map((await db.materials.toArray()).map((m) => [m.id, m.count])),
    [],
  )
  const [open, setOpen] = useState<Open | null>(null)
  const [params, setParams] = useSearchParams()
  const view =
    (['all', 'team', 'character'] as View[]).find((v) => v === params.get('view')) ?? 'all'
  const setView = (v: View) => setParams(v === 'all' ? {} : { view: v }, { replace: true })

  if (!goals || !owned || !weapons || !counts || !teams) return <PageHeader title="Materials" />

  const perGoal = goals.map((g) => ({
    goal: g,
    needs: needsFor(
      g,
      owned.find((c) => c.key === g.characterKey),
      weapons,
    ),
  }))
  const total = sumNeeds(perGoal.map((p) => p.needs))
  const tracked = teams
    .filter((t) => t.trackedAt)
    .sort((a, b) => b.trackedAt!.localeCompare(a.trackedAt!))

  return (
    <>
      <PageHeader
        title="Materials"
        subtitle={
          goals.length ? `${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}` : undefined
        }
        action={
          <Button size="sm" onClick={() => setOpen({})} aria-label="Add goal">
            <Plus size={16} strokeWidth={3} /> Goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          message="Pick a character and what you want to reach, or tap Optimise & track on a team in the Teams tab. You'll see exactly what to farm."
          action={<Button onClick={() => setOpen({})}>Create a goal</Button>}
        />
      ) : (
        <div className="space-y-6">
          <Segmented
            label="Show materials"
            value={view}
            onChange={setView}
            options={[
              { value: 'all', label: 'All' },
              { value: 'team', label: 'By team' },
              { value: 'character', label: 'By character' },
            ]}
          />

          {view === 'all' && (
            <>
              <ul className="space-y-2">
                {perGoal.map(({ goal, needs }) => (
                  <li key={goal.id}>
                    <GoalCard
                      goal={goal}
                      needs={needs}
                      owned={owned}
                      counts={counts}
                      onOpen={() => setOpen({ existing: goal })}
                    />
                  </li>
                ))}
              </ul>
              <NeedsList needs={total} counts={counts} />
            </>
          )}

          {view === 'team' &&
            (tracked.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No teams tracked yet"
                message="On the Teams tab, tap Optimise & track on a team: each member gets a goal for the team's max DPS, and the team's materials show up here."
                action={
                  <Link to="/teams">
                    <Button>Go to Teams</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {tracked.map((team, i) => {
                  const keys = team.members.map((m) => m.characterKey)
                  const mine = perGoal.filter((p) => keys.includes(p.goal.characterKey))
                  return (
                    <li key={team.id}>
                      <TeamTracker
                        team={team}
                        needs={sumNeeds(mine.map((p) => p.needs))}
                        missing={keys.filter((k) => !mine.some((p) => p.goal.characterKey === k))}
                        counts={counts}
                        startOpen={i === 0}
                      />
                    </li>
                  )
                })}
              </ul>
            ))}

          {view === 'character' && (
            <ul className="space-y-3">
              {perGoal.map(({ goal, needs }, i) => (
                <li key={goal.id}>
                  <Expandable
                    startOpen={i === 0}
                    header={
                      <GoalCard
                        goal={goal}
                        needs={needs}
                        owned={owned}
                        counts={counts}
                        onOpen={() => setOpen({ existing: goal })}
                      />
                    }
                  >
                    <NeedsList needs={needs} counts={counts} />
                  </Expandable>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        <GoalSheet
          existing={open.existing}
          owned={owned}
          weapons={weapons}
          goals={goals}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}

function GoalCard({
  goal,
  needs,
  owned,
  counts,
  onOpen,
}: {
  goal: Goal
  needs: Needs
  owned: OwnedCharacter[]
  counts: Map<number, number>
  onOpen: () => void
}) {
  const data = getCharacter(goal.characterKey)
  const current = owned.find((c) => c.key === goal.characterKey)
  if (!data || !current) return null
  const pct = progress(needs, counts)
  return (
    <Card
      element={data.element}
      interactive
      role="button"
      tabIndex={0}
      aria-label={`${data.name} goal, ${Math.round(pct * 100)}% ready`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen()
      }}
      className="flex items-center gap-3 p-3"
    >
      <CharacterAvatar character={data} size={52} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-bold">{data.name}</p>
          <p className="text-sm font-bold text-accent tabular-nums">{Math.round(pct * 100)}%</p>
        </div>
        <p className="truncate text-xs text-muted tabular-nums">
          Lv {current.level} → {goal.targetLevel} ·{' '}
          {talentText(current.key, current.constellation, current.talents)} →{' '}
          {talentText(current.key, current.constellation, goal.targetTalents)}
        </p>
        <ProgressBar value={pct} max={1} />
      </div>
    </Card>
  )
}

function Expandable({
  header,
  children,
  startOpen,
}: {
  header: React.ReactNode
  children: React.ReactNode
  startOpen?: boolean
}) {
  const [open, setOpen] = useState(!!startOpen)
  return (
    <div className="space-y-2">
      {header}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full items-center justify-center gap-1 text-xs font-bold text-accent"
      >
        {open ? 'Hide materials' : 'Show materials'}
        <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} />
      </button>
      {open && children}
    </div>
  )
}

/** One tracked team: everything its members' goals still need, together. */
function TeamTracker({
  team,
  needs,
  missing,
  counts,
  startOpen,
}: {
  team: TeamComp
  needs: Needs
  missing: string[]
  counts: Map<number, number>
  startOpen?: boolean
}) {
  const pct = progress(needs, counts)
  const estimate = resinEstimate(needs, counts, {
    resinPerDay: RESIN_PER_DAY,
    worldLevel: WORLD_LEVEL,
  })
  return (
    <Expandable
      startOpen={startOpen}
      header={
        <Card className="space-y-3 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate font-display text-lg font-semibold">{team.name}</p>
            <p className="text-sm font-bold text-accent tabular-nums">{Math.round(pct * 100)}%</p>
          </div>
          <div className="flex gap-2">
            {team.members.map((m) => {
              const c = getCharacter(m.characterKey)
              return c ? <CharacterAvatar key={m.characterKey} character={c} size={44} /> : null
            })}
          </div>
          <ProgressBar value={pct} max={1} />
          <p className="text-xs text-muted">
            {estimate.days > 0
              ? `About ${estimate.days} ${estimate.days === 1 ? 'day' : 'days'} of resin`
              : 'No resin needed'}
            {estimate.notCounted.length ? ` · plus ${estimate.notCounted.join(', ')}` : ''}
          </p>
          {missing.length > 0 && (
            <p className="text-xs text-faint">
              No goal for {missing.map((k) => getCharacter(k)?.name ?? k).join(', ')}: tap Optimise
              &amp; track again on the Teams tab.
            </p>
          )}
        </Card>
      }
    >
      <NeedsList needs={needs} counts={counts} />
    </Expandable>
  )
}

/** Needed materials grouped by kind, with have/need bars and counters. */
function NeedsList({ needs, counts }: { needs: Needs; counts: Map<number, number> }) {
  const needed = [...needs.materials]
    .map(([id, need]) => ({ material: getMaterial(id)!, need }))
    .filter(({ material }) => material)
  const groups = MATERIAL_GROUPS.map((g) => ({
    label: g.label,
    rows: needed
      .filter(({ material }) => groupOf(material) === g.label)
      .sort((a, b) => a.material.sortRank - b.material.sortRank || a.material.id - b.material.id),
  }))
  const hasExp = needs.characterExp > 0 || needs.weaponExp > 0
  const setCount = (id: number, n: number) => setMaterialCount(id, n)

  if (needed.length === 0 && !hasExp)
    return (
      <Card>
        <EmptyState
          icon={Target}
          title="All set!"
          message="These goals are already reached. Raise a target to see what to farm."
        />
      </Card>
    )
  return (
    <div className="space-y-6">
      {groups.map(({ label, rows }) => {
        const expHere = label === 'Mora & EXP' && hasExp
        if (!rows.length && !expHere) return null
        return (
          <section key={label} className="space-y-2">
            <h2 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">{label}</h2>
            <Card className="divide-y divide-line p-0">
              {rows.map(({ material, need }) => (
                <MaterialRow
                  key={material.id}
                  material={material}
                  have={counts.get(material.id) ?? 0}
                  need={need}
                  onChange={(n) => setCount(material.id, n)}
                />
              ))}
              {expHere && needs.characterExp > 0 && (
                <ExpRow
                  label="Character EXP"
                  items={characterExpItems}
                  need={needs.characterExp}
                  counts={counts}
                  onChange={setCount}
                />
              )}
              {expHere && needs.weaponExp > 0 && (
                <ExpRow
                  label="Weapon EXP"
                  items={weaponExpItems}
                  need={needs.weaponExp}
                  counts={counts}
                  onChange={setCount}
                />
              )}
            </Card>
          </section>
        )
      })}
    </div>
  )
}

function MaterialIcon({ material, size = 40 }: { material: MaterialData; size?: number }) {
  return (
    <img
      src={iconUrl(material.icon)}
      alt=""
      loading="lazy"
      width={size}
      height={size}
      className="shrink-0 rounded-xl object-contain p-0.5"
      style={{ background: rarityBackground(material.rarity), width: size, height: size }}
    />
  )
}

function MaterialRow({
  material,
  have,
  need,
  onChange,
}: {
  material: MaterialData
  have: number
  need: number
  onChange: (n: number) => void
}) {
  const done = have >= need
  return (
    <div className="flex gap-3 p-3">
      <MaterialIcon material={material} size={44} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 text-sm leading-snug font-bold">{material.name}</p>
          <p
            className={cn(
              'shrink-0 text-xs tabular-nums',
              done ? 'font-bold text-mint' : 'text-muted',
            )}
          >
            {have.toLocaleString()} / {need.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar value={have} max={need} className="flex-1" />
          <CountField value={have} onChange={onChange} label={material.name} />
        </div>
      </div>
    </div>
  )
}

function ExpRow({
  label,
  items,
  need,
  counts,
  onChange,
}: {
  label: string
  items: MaterialData[]
  need: number
  counts: Map<number, number>
  onChange: (id: number, n: number) => void
}) {
  const have = expOwned(items, counts)
  const left = Math.max(0, need - have)
  const biggest = items[0]
  return (
    <div className="space-y-2.5 p-3">
      <ProgressBar label={label} value={have} max={need} showCount />
      {left > 0 && (
        <p className="text-xs text-muted">
          About {Math.ceil(left / biggest.exp!).toLocaleString()} more {biggest.name}
        </p>
      )}
      <div className="space-y-2">
        {items.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <MaterialIcon material={m} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
            <CountField
              value={counts.get(m.id) ?? 0}
              onChange={(n) => onChange(m.id, n)}
              label={m.name}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
