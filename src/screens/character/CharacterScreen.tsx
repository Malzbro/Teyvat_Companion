import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Bookmark, Check, Lock, Pencil, Sparkles, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArtifactTile,
  Button,
  Card,
  CharacterAvatar,
  ElementBadge,
  EmptyState,
  ProgressBar,
  ScoreBadge,
  Stepper,
  Toggle,
  WeaponIcon,
  cn,
} from '../../components'
import {
  getArtifactSet,
  getCharacter,
  getMaterial,
  getWeapon,
  iconUrl,
  type ArtifactSlot,
  type CharacterData,
  type StatKey,
} from '../../data'
import { STAT_SHORT, formatStat } from '../../data/stats'
import { db, type Artifact } from '../../db'
import { equipArtifact } from '../../db/artifacts'
import { ARTIFACT_SLOTS, SLOT_LABELS } from '../../engine/artifact'
import { needsFor, progress } from '../../engine/materials'
import { DMG_LABELS, computeBuild, type ConditionState, type DmgKey } from '../../engine/modifiers'
import {
  lockedArtifactIds,
  optimizeInBackground,
  scoreParts,
  type OptimizeResult,
  type SuggestedBuild,
} from '../../engine/optimizer'
import { getProfile } from '../../engine/profiles'
import { GoalSheet } from '../materials/GoalSheet'
import { CharacterSheet } from '../roster/CharacterSheet'
import { TeamPicker } from './TeamPicker'
import { talentText } from '../../engine/talents'
import { newBuild, saveBuild } from '../../db/builds'
import { SavedBuilds } from './SavedBuilds'
import { WEAPON_GUIDES } from '../../data/weaponGuides'
import { WeaponPicks } from './WeaponPicks'

const section = 'text-xs font-bold tracking-[0.18em] text-muted uppercase'

export function CharacterScreen() {
  const { key = '' } = useParams()
  const navigate = useNavigate()
  const data = getCharacter(key)
  const profile = getProfile(key)

  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const weapons = useLiveQuery(() => db.weapons.toArray(), [])
  const artifacts = useLiveQuery(() => db.artifacts.toArray(), [])
  const team = useLiveQuery(() => db.teams.get(key).then((t) => t ?? null), [key])
  const builds = useLiveQuery(() => db.builds.where('characterKey').equals(key).toArray(), [key])
  const teamComps = useLiveQuery(() => db.teamComps.toArray(), [])
  const goal = useLiveQuery(
    () =>
      db.goals
        .where('characterKey')
        .equals(key)
        .first()
        .then((g) => g ?? null),
    [key],
  )
  const counts = useLiveQuery(
    async () => new Map((await db.materials.toArray()).map((m) => [m.id, m.count])),
    [],
  )
  const savedConditions = useLiveQuery(
    () => db.settings.get(`conditions:${key}`).then((s) => (s?.value as ConditionState) ?? {}),
    [key],
  )
  const [editing, setEditing] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)

  const me = owned?.find((c) => c.key === key)
  const teammates = useMemo(() => team?.teammates ?? [], [team])
  const weapon = me?.weaponId ? weapons?.find((w) => w.id === me.weaponId) : undefined
  const weaponData = weapon && getWeapon(weapon.key)
  const conditions = useMemo(() => savedConditions ?? {}, [savedConditions])

  const equipped = useMemo(
    () =>
      ARTIFACT_SLOTS.map((s) => artifacts?.find((a) => a.id === me?.artifactIds[s])).filter(
        (a): a is Artifact => !!a,
      ),
    [artifacts, me],
  )

  const build = useMemo(() => {
    if (!data || !me) return null
    return computeBuild({
      character: data,
      level: me.level,
      ascension: me.ascension,
      weapon:
        weapon && weaponData
          ? {
              data: weaponData,
              level: weapon.level,
              ascension: weapon.ascension,
              refinement: weapon.refinement,
            }
          : undefined,
      artifacts: equipped,
      teammates: teammates.map(getCharacter).filter((c): c is CharacterData => !!c),
      conditions,
    })
  }, [data, me, weapon, weaponData, equipped, teammates, conditions])

  // Re-rank builds whenever anything that matters changes (runs in a Web Worker).
  const optimizeInput = useMemo(() => {
    if (!me || !artifacts || !owned || !profile) return null
    return {
      characterKey: key,
      level: me.level,
      ascension: me.ascension,
      weapon: weapon
        ? {
            key: weapon.key,
            level: weapon.level,
            ascension: weapon.ascension,
            refinement: weapon.refinement,
          }
        : undefined,
      teammates,
      conditions,
      artifacts,
      current: me.artifactIds as Partial<Record<ArtifactSlot, string>>,
      lockedIds: lockedArtifactIds(key, owned),
    }
  }, [key, me, weapon, teammates, conditions, artifacts, owned, profile])
  const inputKey = useMemo(() => JSON.stringify(optimizeInput), [optimizeInput])
  const [result, setResult] = useState<{
    key: string
    value: OptimizeResult | null
    error?: string
  }>()

  useEffect(() => {
    if (!optimizeInput) return
    let cancelled = false
    optimizeInBackground(optimizeInput)
      .then((value) => !cancelled && setResult({ key: inputKey, value }))
      .catch(
        (e: Error) => !cancelled && setResult({ key: inputKey, value: null, error: e.message }),
      )
    return () => {
      cancelled = true
    }
  }, [optimizeInput, inputKey])

  if (!data) return <EmptyState title="Character not found" />
  if (!owned || !weapons || !artifacts || team === undefined || !counts || !builds || !teamComps)
    return null
  if (!me)
    return (
      <EmptyState
        title={`${data.name} isn't in the roster`}
        action={<Button onClick={() => navigate('/roster')}>Go to Roster</Button>}
      />
    )

  const loading = !result || result.key !== inputKey
  const best = result?.value?.builds[0]
  const currentScore =
    build && profile
      ? scoreParts(profile, build.stats.final, build.dmg, build.stats.setCounts).score
      : 0
  const buildScore = best
    ? Math.min(100, (currentScore / Math.max(best.score, currentScore)) * 100)
    : currentScore > 0
      ? 100
      : 0

  const setConditions = (next: ConditionState) =>
    db.settings.put({ key: `conditions:${key}`, value: next })
  const setTeam = (next: string[]) => db.teams.put({ characterKey: key, teammates: next })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/roster"
          className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-bold text-muted hover:text-ink"
        >
          <ArrowLeft size={18} /> Roster
        </Link>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={15} /> Edit
        </Button>
      </div>

      <Card element={data.element} flush>
        <div className="flex items-center gap-4 p-4">
          <CharacterAvatar character={data} size={88} className="rounded-3xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="font-display text-3xl leading-tight font-semibold">{data.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <ElementBadge element={data.element} />
              {me.locked && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                  <Lock size={12} /> Locked
                </span>
              )}
            </div>
            <p className="text-sm text-muted tabular-nums">
              Lv. {me.level} · C{me.constellation} · Talents{' '}
              {talentText(me.key, me.constellation, me.talents)}
            </p>
          </div>
        </div>
        {weaponData && weapon && (
          <div className="flex items-center gap-3 border-t border-line px-4 py-3">
            <WeaponIcon weapon={weaponData} size={40} />
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{weaponData.name}</p>
            <p className="text-xs text-muted tabular-nums">
              Lv. {weapon.level} · R{weapon.refinement}
            </p>
          </div>
        )}
      </Card>

      {/* Team */}
      <section className="space-y-2.5">
        <h2 className={section}>Team</h2>
        <TeamPicker
          characterKey={key}
          teammates={teammates}
          owned={owned}
          active={build?.resonances ?? []}
          onChange={setTeam}
        />
      </section>

      {/* Conditions */}
      {build && build.conditions.length > 0 && (
        <section className="space-y-2.5">
          <h2 className={section}>Effects in play</h2>
          <div className="space-y-2">
            {build.conditions.map((c) =>
              c.kind === 'toggle' ? (
                <Toggle
                  key={c.id}
                  checked={c.value > 0}
                  onChange={(on) => setConditions({ ...conditions, [c.id]: on ? 1 : 0 })}
                  label={c.label}
                  description={c.source}
                />
              ) : (
                <div key={c.id} className="rounded-2xl border border-line bg-surface p-3">
                  <Stepper
                    label={c.label}
                    value={c.value}
                    min={0}
                    max={c.max ?? 1}
                    onChange={(v) => setConditions({ ...conditions, [c.id]: v })}
                  />
                  <p className="mt-1 text-xs text-muted">{c.source}</p>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {/* Current build */}
      {build && (
        <section className="space-y-2.5">
          <h2 className={section}>Current build</h2>
          <Card className="space-y-4">
            <div className="flex items-center gap-4">
              <ScoreBadge score={buildScore} label="Build score" />
              <p className="flex-1 text-sm text-muted">
                {loading
                  ? 'Checking your artifacts…'
                  : best
                    ? buildScore >= 99.5
                      ? 'The best build your artifacts can make. ✿'
                      : `${Math.round(buildScore)}% of the best build your artifacts can make.`
                    : 'Add artifacts to see how this build compares.'}
              </p>
            </div>
            <StatList build={build} element={data.element} />
            <div className="grid grid-cols-5 gap-1.5">
              {ARTIFACT_SLOTS.map((s) => {
                const a = equipped.find((x) => x.slot === s)
                const set = a && getArtifactSet(a.setKey)
                return a && set ? (
                  <ArtifactTile key={s} artifact={a} set={set} />
                ) : (
                  <div
                    key={s}
                    className="grid aspect-[4/5] place-items-center rounded-2xl border border-dashed border-line text-[10px] text-faint"
                  >
                    {SLOT_LABELS[s]}
                  </div>
                )
              })}
            </div>
            {build.notes.length > 0 && (
              <details className="text-sm text-muted">
                <summary className="cursor-pointer font-semibold text-ink">
                  Notes ({build.notes.length})
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {build.notes.map((n, i) => (
                    <li key={i}>
                      <span className="font-semibold text-ink">{n.source}:</span> {n.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
          {profile?.generic && (
            <p className="text-xs text-faint">
              {data.name} uses a simple starting profile (ATK, Skill damage, no set picks yet).
            </p>
          )}
        </section>
      )}

      {/* Weapons */}
      {WEAPON_GUIDES[key] && (
        <section className="space-y-2.5">
          <h2 className={section}>Best weapons</h2>
          <WeaponPicks me={me} owned={owned} weapons={weapons} />
        </section>
      )}

      {/* Saved builds */}
      <section className="space-y-2.5">
        <h2 className={section}>Saved builds</h2>
        <SavedBuilds
          me={me}
          builds={builds}
          artifacts={artifacts}
          weapons={weapons}
          teams={teamComps}
        />
      </section>

      {/* Best builds */}
      <section className="space-y-2.5">
        <h2 className={section}>Best builds</h2>
        {result?.error ? (
          <p className="text-sm text-danger">{result.error}</p>
        ) : !result?.value ? (
          <Card className="text-sm text-muted">Finding the best builds…</Card>
        ) : result.value.builds.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No artifacts to try yet"
            message="Add artifacts and the best combinations will show up here."
          />
        ) : (
          <div className={cn('space-y-3 transition-opacity', loading && 'opacity-60')}>
            {result.value.builds
              // Only her current build and better ones are worth showing.
              .filter((b) => b.swaps.length === 0 || b.gain === null || b.gain > 0.05)
              .map((b, i) => (
                <BuildCard
                  key={JSON.stringify(b.pieces)}
                  rank={i + 1}
                  build={b}
                  artifacts={artifacts}
                  owned={owned}
                  characterKey={key}
                  weaponId={me.weaponId}
                  savedCount={builds.length}
                  minER={profile?.minER}
                />
              ))}
          </div>
        )}
      </section>

      {/* Materials */}
      <section className="space-y-2.5">
        <h2 className={section}>Materials</h2>
        {goal ? (
          <GoalSummary
            goalNeeds={needsFor(goal, me, weapons)}
            counts={counts}
            onEdit={() => setGoalOpen(true)}
          />
        ) : (
          <Card className="flex items-center gap-3">
            <Target className="text-accent" />
            <p className="flex-1 text-sm text-muted">No goal yet for {data.name}.</p>
            <Button size="sm" onClick={() => setGoalOpen(true)}>
              Set a goal
            </Button>
          </Card>
        )}
      </section>

      {editing && (
        <CharacterSheet
          existing={me}
          owned={owned}
          weapons={weapons}
          onClose={() => {
            setEditing(false)
            // If she removed the character, leave the page.
            db.characters.get(key).then((c) => !c && navigate('/roster'))
          }}
        />
      )}
      {goalOpen && (
        <GoalSheet
          existing={goal ?? undefined}
          owned={owned}
          weapons={weapons}
          goals={goal ? [goal] : []}
          initialCharacter={key}
          onClose={() => setGoalOpen(false)}
        />
      )}
    </div>
  )
}

function StatList({
  build,
  element,
}: {
  build: NonNullable<ReturnType<typeof computeBuild>>
  element: string
}) {
  const f = build.stats.final
  const elementKey = `${element.toLowerCase()}_dmg_` as StatKey
  const keys: StatKey[] = [
    'hp',
    'atk',
    'def',
    'eleMas',
    'critRate_',
    'critDMG_',
    'enerRech_',
    elementKey,
  ]
  if (f.heal_ > 0) keys.push('heal_')
  // [label, value, full width]
  const rows: [string, string, boolean][] = keys.map((k) => [
    STAT_SHORT[k],
    formatStat(k, f[k]),
    false,
  ])
  for (const [k, v] of Object.entries(build.dmg) as [DmgKey, number][])
    if (v > 0) rows.push([DMG_LABELS[k], `+${(v * 100).toFixed(1)}%`, true])
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value, wide]) => (
        <div
          key={label}
          className={cn(
            'flex items-baseline justify-between gap-2 border-b border-line/60 pb-1',
            wide && 'col-span-2',
          )}
        >
          <dt className="truncate text-muted">{label}</dt>
          <dd className="font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function BuildCard({
  rank,
  build,
  artifacts,
  owned,
  characterKey,
  weaponId,
  savedCount,
  minER,
}: {
  rank: number
  build: SuggestedBuild
  artifacts: Artifact[]
  owned: { key: string; artifactIds: Record<ArtifactSlot, string | null> }[]
  characterKey: string
  weaponId: string | null
  savedCount: number
  minER?: number
}) {
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const wearerOf = (id: string) =>
    owned.find((c) => c.key !== characterKey && Object.values(c.artifactIds).includes(id))
  const same = build.swaps.length === 0
  const better = build.gain === null || build.gain > 0.05
  const gainText = same
    ? 'Current'
    : build.gain === null
      ? 'New'
      : Math.abs(build.gain) < 0.05
        ? 'Same'
        : `${build.gain > 0 ? '+' : '−'}${Math.abs(build.gain).toFixed(1)}%`

  async function equip() {
    setBusy(true)
    try {
      for (const slot of build.swaps) {
        const id = build.pieces[slot]
        if (id) await equipArtifact(characterKey, id)
      }
    } finally {
      setBusy(false)
    }
  }

  async function saveAsBuild() {
    const artifactIds = Object.fromEntries(
      ARTIFACT_SLOTS.map((s) => [s, build.pieces[s] ?? null]),
    ) as Record<ArtifactSlot, string | null>
    const name = `${build.reason.split(' · ')[0]}`.slice(0, 30) || `Build ${savedCount + 1}`
    await saveBuild(newBuild({ key: characterKey, weaponId, artifactIds }, name))
    setSaved(true)
  }

  return (
    <Card className={cn('space-y-3', rank === 1 && 'border-accent/40')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-accent uppercase">#{rank}</p>
          <p className="font-bold">{same ? 'Already equipped ✿' : build.reason}</p>
        </div>
        <p
          className={cn(
            'shrink-0 font-display text-xl font-semibold tabular-nums',
            !same && better ? 'text-mint' : 'text-muted',
          )}
        >
          {gainText}
        </p>
      </div>
      {!build.meetsER && minER && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          Below the {Math.round(minER * 100)}% Energy Recharge target — no build reaches it yet.
        </p>
      )}
      {!same && (
        <div className="grid grid-cols-5 gap-1.5">
          {ARTIFACT_SLOTS.map((s) => {
            const id = build.pieces[s]
            const a = id ? artifacts.find((x) => x.id === id) : undefined
            const set = a && getArtifactSet(a.setKey)
            const changed = build.swaps.includes(s)
            const from = id ? wearerOf(id) : undefined
            return (
              <div key={s} className={cn('space-y-1', !changed && 'opacity-40')}>
                {a && set ? (
                  <ArtifactTile
                    artifact={a}
                    set={set}
                    wearer={from ? getCharacter(from.key) : undefined}
                  />
                ) : (
                  <div className="aspect-[4/5] rounded-2xl border border-dashed border-line" />
                )}
                <p className="truncate text-center text-[10px] text-faint">
                  {changed ? (from ? `from ${getCharacter(from.key)?.name}` : 'swap in') : 'keep'}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {!same && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={saveAsBuild}
            disabled={saved}
            aria-label="Save as build"
            className="shrink-0"
          >
            {saved ? <Check size={16} /> : <Bookmark size={16} />}
            {saved ? 'Saved' : 'Save'}
          </Button>
          <Button block variant={better ? 'primary' : 'secondary'} onClick={equip} disabled={busy}>
            {busy
              ? 'Equipping…'
              : `Equip (${build.swaps.length} ${build.swaps.length === 1 ? 'swap' : 'swaps'})`}
          </Button>
        </div>
      )}
    </Card>
  )
}

function GoalSummary({
  goalNeeds,
  counts,
  onEdit,
}: {
  goalNeeds: ReturnType<typeof needsFor>
  counts: Map<number, number>
  onEdit: () => void
}) {
  const pct = progress(goalNeeds, counts)
  const missing = [...goalNeeds.materials]
    .map(([id, need]) => ({ m: getMaterial(id), need, have: counts.get(id) ?? 0 }))
    .filter((x) => x.m && x.have < x.need)
    .slice(0, 4)
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">Goal {Math.round(pct * 100)}% ready</p>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit goal
          </Button>
          <Link
            to="/materials"
            className="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-bold text-accent"
          >
            All materials
          </Link>
        </div>
      </div>
      <ProgressBar value={pct} max={1} />
      {missing.length > 0 && (
        <ul className="space-y-2">
          {missing.map(({ m, need, have }) => (
            <li key={m!.id} className="flex items-center gap-2.5 text-sm">
              <img src={iconUrl(m!.icon)} alt="" className="size-7 rounded-lg" loading="lazy" />
              <span className="min-w-0 flex-1 truncate">{m!.name}</span>
              <span className="text-xs text-muted tabular-nums">
                {have.toLocaleString()} / {need.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
