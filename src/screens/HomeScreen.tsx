import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Skull, Target } from 'lucide-react'
import { Link } from 'react-router'
import {
  Button,
  Card,
  CharacterAvatar,
  ElementBadge,
  EmptyState,
  ProgressBar,
  rarityBackground,
} from '../components'
import { FEATURED_CHARACTER, RESIN_PER_DAY, SERVER_REGION, WORLD_LEVEL } from '../config'
import { getCharacter, iconUrl, type MaterialData } from '../data'
import { db } from '../db'
import {
  bossNeeds,
  domainsToday,
  familyRemaining,
  families,
  resinEstimate,
  serverWeekday,
} from '../engine/farming'
import { needsFor, progress, sumNeeds } from '../engine/materials'
import { PageHeader } from './PageHeader'

const section = 'text-xs font-bold tracking-[0.18em] text-muted uppercase'

function greeting(hour: number) {
  if (hour < 5) return 'Still up?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Icon({ material, size = 36 }: { material: MaterialData; size?: number }) {
  return (
    <img
      src={iconUrl(material.icon)}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-xl object-contain p-0.5"
      style={{ width: size, height: size, background: rarityBackground(material.rarity) }}
    />
  )
}

export function HomeScreen() {
  const featured = getCharacter(FEATURED_CHARACTER)!
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const weapons = useLiveQuery(() => db.weapons.toArray(), [])
  const counts = useLiveQuery(
    async () => new Map((await db.materials.toArray()).map((m) => [m.id, m.count])),
    [],
  )

  const now = new Date()
  const today = serverWeekday(now, SERVER_REGION)
  const ready = !!(goals && owned && weapons && counts)

  const perGoal = ready
    ? goals!
        .map((g) => {
          const needs = needsFor(
            g,
            owned!.find((c) => c.key === g.characterKey),
            weapons!,
          )
          return {
            goal: g,
            character: getCharacter(g.characterKey)!,
            needs,
            fams: families(needs, counts!),
            pct: progress(needs, counts!),
            estimate: resinEstimate(needs, counts!, {
              resinPerDay: RESIN_PER_DAY,
              worldLevel: WORLD_LEVEL,
            }),
          }
        })
        .filter((x) => x.character)
    : []
  const allFams = ready ? families(sumNeeds(perGoal.map((p) => p.needs)), counts!) : []
  const domains = domainsToday(allFams, today)
  const bosses = bossNeeds(allFams)
  const whoNeeds = (familyKey: string) =>
    perGoal
      .filter((p) => p.fams.some((f) => f.key === familyKey && familyRemaining(f) > 0))
      .map((p) => p.character)

  return (
    <div className="space-y-6">
      <PageHeader title="Teyvat Companion" subtitle={greeting(now.getHours())} />

      <Card element={featured.element} flush>
        <div className="relative h-44 overflow-hidden">
          <img
            src={iconUrl(featured.icons.splash)}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover object-[60%_25%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-solid via-surface-solid/30 to-transparent" />
        </div>
        <div className="relative -mt-12 flex items-end justify-between gap-2 p-4">
          <div className="space-y-1.5">
            <ElementBadge element={featured.element} />
            <h2 className="font-display text-2xl font-semibold">{featured.name}</h2>
          </div>
          {owned?.some((c) => c.key === featured.key) && (
            <Link
              to={`/character/${featured.key}`}
              className="rounded-full bg-surface-strong px-4 py-2 text-sm font-bold"
            >
              Open build →
            </Link>
          )}
        </div>
      </Card>

      {ready && goals!.length === 0 && (
        <Card>
          <EmptyState
            icon={Target}
            title="What are we working towards?"
            message="Set a goal and this page will tell you what to farm each day."
            action={
              <Link to="/materials">
                <Button>Set a goal</Button>
              </Link>
            }
          />
        </Card>
      )}

      {ready && goals!.length > 0 && (
        <>
          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className={section}>Today · {today}</h2>
              <span className="text-xs text-faint">{SERVER_REGION} server</span>
            </div>
            {today === 'Sunday' && (
              <p className="text-sm text-mint">Sunday: every domain is open. ✿</p>
            )}
            {domains.length === 0 ? (
              <Card className="flex items-center gap-3 text-sm text-muted">
                <CalendarDays className="shrink-0 text-accent" />
                No talent or weapon domain today helps your goals. A good day for bosses or ley
                lines.
              </Card>
            ) : (
              domains.map((d) => (
                <Card key={d.domain} className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-accent">
                      {d.kind === 'talent' ? 'Talent books' : 'Weapon materials'}
                    </p>
                    <p className="font-bold">{d.domain.replace(/^Domain of \w+: /, '')}</p>
                  </div>
                  {d.families.map((f) => {
                    const who = whoNeeds(f.key)
                    return (
                      <div key={f.key} className="flex items-center gap-3">
                        <Icon material={f.materials[0].material} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {f.materials[0].material.name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            For {who.map((c) => c.name).join(', ')}
                          </p>
                        </div>
                        <div className="flex -space-x-2">
                          {who.slice(0, 3).map((c) => (
                            <CharacterAvatar
                              key={c.key}
                              character={c}
                              size={28}
                              className="rounded-full ring-2 ring-surface-solid"
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </Card>
              ))
            )}
          </section>

          {bosses.length > 0 && (
            <section className="space-y-2.5">
              <h2 className={section}>Boss materials</h2>
              <Card className="space-y-2.5">
                {bosses.map((f) => {
                  const m = f.materials[0]
                  return (
                    <div key={f.key} className="flex items-center gap-3">
                      <Icon material={m.material} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{m.material.name}</p>
                        <p className="text-xs text-muted">
                          {f.kind === 'weekly' ? 'Weekly boss' : 'World boss'}
                        </p>
                      </div>
                      <span className="text-xs text-muted tabular-nums">
                        {m.have} / {m.need}
                      </span>
                    </div>
                  )
                })}
              </Card>
            </section>
          )}

          <section className="space-y-2.5">
            <h2 className={section}>Goals</h2>
            <ul className="space-y-2">
              {perGoal.map(({ goal, character, pct, estimate }) => (
                <li key={goal.id}>
                  <Link to={`/character/${goal.characterKey}`}>
                    <Card
                      element={character.element}
                      interactive
                      className="flex items-center gap-3 p-3"
                    >
                      <CharacterAvatar character={character} size={48} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-bold">{character.name}</p>
                          <p className="text-sm font-bold text-accent tabular-nums">
                            {Math.round(pct * 100)}%
                          </p>
                        </div>
                        <ProgressBar value={pct} max={1} />
                        <p className="text-xs text-muted">
                          {estimate.days === 0
                            ? pct >= 1
                              ? 'Ready to level up! ✿'
                              : 'No domain or boss farming left'
                            : `About ${estimate.days} ${estimate.days === 1 ? 'day' : 'days'} of resin`}
                          {estimate.notCounted.length > 0 &&
                            ` · plus ${estimate.notCounted.join(' and ')}`}
                        </p>
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-1.5 text-xs text-faint">
              <Skull size={12} className="shrink-0" /> Estimates use average drops, {RESIN_PER_DAY}{' '}
              resin a day and World Level {WORLD_LEVEL} (WL 8 drop rates).
            </p>
          </section>
        </>
      )}
    </div>
  )
}
