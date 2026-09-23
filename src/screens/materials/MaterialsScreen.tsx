import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Target } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Card,
  CharacterAvatar,
  CountField,
  cn,
  EmptyState,
  ProgressBar,
  rarityBackground,
} from '../../components'
import { getCharacter, getMaterial, iconUrl, type MaterialData } from '../../data'
import { db, type Goal } from '../../db'
import { setMaterialCount } from '../../db/goals'
import {
  MATERIAL_GROUPS,
  characterExpItems,
  expOwned,
  groupOf,
  needsFor,
  progress,
  sumNeeds,
  weaponExpItems,
} from '../../engine/materials'
import { PageHeader } from '../PageHeader'
import { GoalSheet } from './GoalSheet'
import { talentText } from '../../engine/talents'

type Open = { existing?: Goal }

export function MaterialsScreen() {
  const goals = useLiveQuery(() => db.goals.orderBy('characterKey').toArray(), [])
  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const weapons = useLiveQuery(() => db.weapons.toArray(), [])
  const counts = useLiveQuery(
    async () => new Map((await db.materials.toArray()).map((m) => [m.id, m.count])),
    [],
  )
  const [open, setOpen] = useState<Open | null>(null)

  if (!goals || !owned || !weapons || !counts) return <PageHeader title="Materials" />

  const perGoal = goals.map((g) => ({
    goal: g,
    needs: needsFor(
      g,
      owned.find((c) => c.key === g.characterKey),
      weapons,
    ),
  }))
  const total = sumNeeds(perGoal.map((p) => p.needs))

  const needed = [...total.materials]
    .map(([id, need]) => ({ material: getMaterial(id)!, need }))
    .filter(({ material }) => material)
  const groups = MATERIAL_GROUPS.map((g) => ({
    label: g.label,
    rows: needed
      .filter(({ material }) => groupOf(material) === g.label)
      .sort((a, b) => a.material.sortRank - b.material.sortRank || a.material.id - b.material.id),
  }))
  const hasExp = total.characterExp > 0 || total.weaponExp > 0
  const setCount = (id: number, n: number) => setMaterialCount(id, n)

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
          message="Pick a character and what you want to reach. You'll see exactly what to farm."
          action={<Button onClick={() => setOpen({})}>Create a goal</Button>}
        />
      ) : (
        <div className="space-y-6">
          <ul className="space-y-2">
            {perGoal.map(({ goal, needs }) => {
              const data = getCharacter(goal.characterKey)
              const current = owned.find((c) => c.key === goal.characterKey)
              if (!data || !current) return null
              const pct = progress(needs, counts)
              return (
                <li key={goal.id}>
                  <Card
                    element={data.element}
                    interactive
                    role="button"
                    tabIndex={0}
                    aria-label={`${data.name} goal, ${Math.round(pct * 100)}% ready`}
                    onClick={() => setOpen({ existing: goal })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setOpen({ existing: goal })
                    }}
                    className="flex items-center gap-3 p-3"
                  >
                    <CharacterAvatar character={data} size={52} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-bold">{data.name}</p>
                        <p className="text-sm font-bold text-accent tabular-nums">
                          {Math.round(pct * 100)}%
                        </p>
                      </div>
                      <p className="truncate text-xs text-muted tabular-nums">
                        Lv {current.level} → {goal.targetLevel} ·{' '}
                        {talentText(current.key, current.constellation, current.talents)} →{' '}
                        {talentText(current.key, current.constellation, goal.targetTalents)}
                      </p>
                      <ProgressBar value={pct} max={1} />
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>

          {needed.length === 0 && !hasExp ? (
            <Card>
              <EmptyState
                icon={Target}
                title="All set!"
                message="These goals are already reached. Raise a target to see what to farm."
              />
            </Card>
          ) : (
            groups.map(({ label, rows }) => {
              const expHere = label === 'Mora & EXP' && hasExp
              if (!rows.length && !expHere) return null
              return (
                <section key={label} className="space-y-2">
                  <h2 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">
                    {label}
                  </h2>
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
                    {expHere && total.characterExp > 0 && (
                      <ExpRow
                        label="Character EXP"
                        items={characterExpItems}
                        need={total.characterExp}
                        counts={counts}
                        onChange={setCount}
                      />
                    )}
                    {expHere && total.weaponExp > 0 && (
                      <ExpRow
                        label="Weapon EXP"
                        items={weaponExpItems}
                        need={total.weaponExp}
                        counts={counts}
                        onChange={setCount}
                      />
                    )}
                  </Card>
                </section>
              )
            })
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
