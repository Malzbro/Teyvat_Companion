import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  ArtifactTile,
  Button,
  Card,
  CharacterAvatar,
  Chip,
  EmptyState,
  Stepper,
  Toggle,
  cn,
} from '../../components'
import { getArtifactSet, getCharacter } from '../../data'
import { db, type Artifact, type OwnedCharacter, type OwnedWeapon } from '../../db'
import { applyTeamPlan } from '../../db/optimise'
import { ARTIFACT_SLOTS, SLOT_LABELS } from '../../engine/artifact'
import type { ConditionState } from '../../engine/modifiers'
import {
  planTeamInBackground,
  suggestTeamsInBackground,
  type SuggestResult,
  type TeamPlan,
  type TeamSuggestion,
} from '../../engine/optimizer'
import { getProfile, isSupportProfile } from '../../engine/profiles'
import { setSummary } from '../../engine/setSummary'
import { buffsFor } from '../../engine/teams/suggest'
import { ResonanceBadges } from '../character/TeamPicker'
import { PageHeader } from '../PageHeader'
import { partyResonances } from '../teams/party'

const section = 'text-xs font-bold tracking-[0.18em] text-faint uppercase'
const DEFAULT_FOCAL = 'clorinde'

export function OptimiseScreen() {
  const owned = useLiveQuery(() => db.characters.toArray(), [])
  const weapons = useLiveQuery(() => db.weapons.toArray(), [])
  const artifacts = useLiveQuery(() => db.artifacts.toArray(), [])
  const savedFocal = useLiveQuery(
    () => db.settings.get('optimise:focal').then((s) => (s?.value as string) ?? null),
    [],
  )
  const [picked, setPicked] = useState<string | null>(null)

  // Characters whose damage can be ranked (supports are scored by their buffs, not damage).
  const candidates = useMemo(
    () => (owned ?? []).filter((c) => !isSupportProfile(getProfile(c.key)!)),
    [owned],
  )
  const focalKey =
    [picked, savedFocal, DEFAULT_FOCAL].find((k) => k && candidates.some((c) => c.key === k)) ??
    candidates[0]?.key

  if (!owned || !weapons || !artifacts || savedFocal === undefined)
    return <PageHeader title="Optimise" />
  if (!focalKey)
    return (
      <>
        <PageHeader title="Optimise" subtitle="Best teams & gear" />
        <EmptyState
          icon={Sparkles}
          title="Add a damage dealer first"
          message="Add a character to the Roster and this page will find the best team and artifacts for them from everything you own."
        />
      </>
    )

  return (
    <>
      <PageHeader title="Optimise" subtitle="Best teams & gear" />
      <p className="mb-4 text-sm text-muted">
        Pick who you’re building around. This tries every team you can make from your own
        characters, with your own artifacts, and ranks them by how much damage they do.
      </p>
      <div
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Character"
      >
        {candidates.map((c) => {
          const data = getCharacter(c.key)
          return (
            <Chip
              key={c.key}
              selected={c.key === focalKey}
              className="shrink-0"
              onClick={() => {
                setPicked(c.key)
                db.settings.put({ key: 'optimise:focal', value: c.key })
              }}
            >
              {data && <CharacterAvatar character={data} size={24} />}
              {data?.name ?? c.key}
            </Chip>
          )
        })}
      </div>
      <Focal
        key={focalKey}
        focalKey={focalKey}
        owned={owned}
        weapons={weapons}
        artifacts={artifacts}
      />
    </>
  )
}

function Focal({
  focalKey,
  owned,
  weapons,
  artifacts,
}: {
  focalKey: string
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  artifacts: Artifact[]
}) {
  const data = getCharacter(focalKey)!
  const me = owned.find((c) => c.key === focalKey)!
  const team = useLiveQuery(() => db.teams.get(focalKey).then((t) => t ?? null), [focalKey])
  const saved = useLiveQuery(
    () => db.settings.get(`conditions:${focalKey}`).then((s) => (s?.value as ConditionState) ?? {}),
    [focalKey],
  )
  const conditions = useMemo(() => saved ?? {}, [saved])
  const setConditions = (next: ConditionState) =>
    db.settings.put({ key: `conditions:${focalKey}`, value: next })

  // Toggles for the buffs your teammates could give (only characters you own).
  const buffConditions = useMemo(
    () =>
      buffsFor(
        me,
        owned.filter((c) => c.key !== focalKey).map((c) => c.key),
        { owned, weapons, artifacts },
      ).conditions,
    [me, owned, weapons, artifacts, focalKey],
  )

  const input = useMemo(
    () =>
      team === undefined
        ? null
        : {
            focalKey,
            owned,
            weapons,
            artifacts,
            conditions,
            currentTeammates: team?.teammates ?? [],
          },
    [focalKey, owned, weapons, artifacts, conditions, team],
  )
  const inputKey = useMemo(() => JSON.stringify(input), [input])
  const [result, setResult] = useState<{ key: string; value?: SuggestResult; error?: string }>()
  useEffect(() => {
    if (!input) return
    let cancelled = false
    suggestTeamsInBackground(input)
      .then((value) => !cancelled && setResult({ key: inputKey, value }))
      .catch((e: Error) => !cancelled && setResult({ key: inputKey, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [input, inputKey])

  const loading = !result || result.key !== inputKey
  const value = result?.value

  return (
    <div className="space-y-6">
      {buffConditions.length > 0 && (
        <details className="group rounded-2xl border border-line bg-surface">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold">
            Assumptions about your teammates’ buffs
            <ChevronDown size={18} className="transition group-open:rotate-180" />
          </summary>
          <div className="space-y-2 px-3 pb-3">
            {buffConditions.map((c) =>
              c.kind === 'toggle' ? (
                <Toggle
                  key={c.id}
                  checked={(conditions[c.id] ?? c.default) > 0}
                  onChange={(on) => setConditions({ ...conditions, [c.id]: on ? 1 : 0 })}
                  label={c.label}
                  description={c.source}
                />
              ) : (
                <div key={c.id} className="rounded-2xl border border-line bg-surface p-3">
                  <Stepper
                    label={c.label}
                    value={conditions[c.id] ?? c.default}
                    min={0}
                    max={c.max ?? 1}
                    step={50}
                    onChange={(v) => setConditions({ ...conditions, [c.id]: v })}
                  />
                  <p className="mt-1 text-xs text-muted">{c.source}</p>
                </div>
              ),
            )}
          </div>
        </details>
      )}

      <section className="space-y-2.5">
        <h2 className={section}>Best teams for {data.name}</h2>
        {result?.error ? (
          <p className="text-sm text-danger">{result.error}</p>
        ) : !value ? (
          <Card className="text-sm text-muted">Trying every team you can make…</Card>
        ) : value.message ? (
          <EmptyState icon={Sparkles} title="Nothing to rank yet" message={value.message} />
        ) : (
          <div className={cn('space-y-3 transition-opacity', loading && 'opacity-60')}>
            {value.current && (
              <p className="text-sm text-muted">
                Compared with your current team (
                {value.current.teammates.map((k) => getCharacter(k)?.name).join(', ')}).
              </p>
            )}
            {value.teams.map((t, i) => (
              <TeamCard
                key={t.teammates.join(',')}
                rank={i + 1}
                suggestion={t}
                best={value.teams[0]}
                focalKey={focalKey}
                owned={owned}
                weapons={weapons}
                artifacts={artifacts}
                conditions={conditions}
              />
            ))}
            <p className="text-xs text-faint">
              Counts: elemental resonance, weapon and set effects, and the buffs from Bennett,
              Furina, Yelan and Xilonen. Not counted: healing, shields, energy and every other
              teammate’s kit — so a team can rank lower here and still be comfortable to play.
              Checked {value.checked} teams in {Math.round(value.ms)} ms.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function TeamCard({
  rank,
  suggestion: t,
  best,
  focalKey,
  owned,
  weapons,
  artifacts,
  conditions,
}: {
  rank: number
  suggestion: TeamSuggestion
  best: TeamSuggestion
  focalKey: string
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  artifacts: Artifact[]
  conditions: ConditionState
}) {
  const party = [focalKey, ...t.teammates]
  const [plan, setPlan] = useState<TeamPlan | 'loading' | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string>()

  // Gear is worked out when asked for: it runs the artifact search for all four.
  async function showGear() {
    setPlan('loading')
    try {
      setPlan(await planTeamInBackground({ owned, weapons, artifacts, conditions, party }))
    } catch (e) {
      setPlan(null)
      setError((e as Error).message)
    }
  }

  async function use() {
    if (!plan || plan === 'loading') return
    setState('busy')
    try {
      await applyTeamPlan(`${getCharacter(focalKey)?.name} · optimised`, party, plan)
      setState('done')
    } catch (e) {
      setError((e as Error).message)
      setState('idle')
    }
  }

  const vsBest = (t.score / best.score - 1) * 100
  const headline =
    t.gain !== null
      ? `${t.gain >= 0.05 ? '+' : t.gain <= -0.05 ? '−' : ''}${Math.abs(t.gain).toFixed(1)}%`
      : rank === 1
        ? 'Best'
        : `${vsBest.toFixed(1).replace('-', '−')}%`

  return (
    <Card className={cn('space-y-3', rank === 1 && 'border-accent/40')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-accent uppercase">#{rank}</p>
          <p className="truncate font-bold">
            {t.teammates.map((k) => getCharacter(k)?.name ?? k).join(' · ')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              'font-display text-xl font-semibold tabular-nums',
              t.gain !== null && t.gain > 0.05 ? 'text-mint' : 'text-muted',
            )}
          >
            {headline}
          </p>
          <p className="text-[10px] text-faint">
            {t.gain !== null ? 'vs your team' : rank === 1 ? 'damage' : 'vs #1'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {party.map((k) => {
          const c = getCharacter(k)
          return (
            <div key={k} className="flex min-w-0 flex-col items-center gap-1">
              {c && <CharacterAvatar character={c} size={52} />}
              <span className="w-full truncate text-center text-xs font-bold">{c?.name}</span>
            </div>
          )
        })}
      </div>

      <ResonanceBadges active={partyResonances(party)} onlyActive />

      {t.contributions.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {t.contributions.map((c) => (
            <li key={c.key} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-muted">
                <b className="text-ink">{getCharacter(c.key)?.name}</b> · {c.text}
              </span>
              <span className="shrink-0 font-bold text-mint tabular-nums">
                +{c.gain.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-faint">No counted buffs — only resonance and gear.</p>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {plan === null ? (
        <Button block variant="secondary" onClick={showGear}>
          Show the best artifacts for this team
        </Button>
      ) : plan === 'loading' ? (
        <p className="py-2 text-center text-sm text-muted">Finding gear for all four…</p>
      ) : (
        <>
          <Gear plan={plan} owned={owned} artifacts={artifacts} />
          <Button
            block
            variant={state === 'done' ? 'secondary' : 'primary'}
            onClick={use}
            disabled={state === 'busy'}
          >
            {state === 'busy' ? (
              'Equipping…'
            ) : state === 'done' ? (
              <>
                <Check size={16} /> Team and gear ready
              </>
            ) : (
              'Use this team and gear'
            )}
          </Button>
        </>
      )}
    </Card>
  )
}

function Gear({
  plan,
  owned,
  artifacts,
}: {
  plan: TeamPlan
  owned: OwnedCharacter[]
  artifacts: Artifact[]
}) {
  const wearerOf = (id: string) => owned.find((c) => Object.values(c.artifactIds).includes(id))?.key
  return (
    <div className="space-y-4">
      {plan.members.map((m) => {
        const c = getCharacter(m.key)
        const b = m.build
        const gain = b && m.currentScore > 0 ? (m.score / m.currentScore - 1) * 100 : null
        return (
          <div key={m.key} className="space-y-2">
            <div className="flex items-center gap-2">
              {c && <CharacterAvatar character={c} size={32} />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{c?.name}</p>
                <p className="truncate text-xs text-muted">
                  {b ? b.reason : 'No artifacts left to suggest'}
                </p>
              </div>
              {gain !== null && (
                <span
                  className={cn(
                    'shrink-0 text-sm font-bold tabular-nums',
                    gain > 0.05 ? 'text-mint' : 'text-muted',
                  )}
                >
                  {b!.swaps.length === 0
                    ? 'Keep'
                    : `${gain >= 0 ? '+' : '−'}${Math.abs(gain).toFixed(1)}%`}
                </span>
              )}
            </div>
            {m.warning && (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{m.warning}</p>
            )}
            {b && (
              <div className="grid grid-cols-5 gap-1.5">
                {ARTIFACT_SLOTS.map((s) => {
                  const id = b.pieces[s]
                  const a = id ? artifacts.find((x) => x.id === id) : undefined
                  const set = a && getArtifactSet(a.setKey)
                  const changed = b.swaps.includes(s)
                  const from = id ? wearerOf(id) : undefined
                  return (
                    <div key={s} className={cn('space-y-1', !changed && 'opacity-50')}>
                      {a && set ? (
                        <ArtifactTile artifact={a} set={set} />
                      ) : (
                        <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-dashed border-line text-[10px] text-faint">
                          {SLOT_LABELS[s]}
                        </div>
                      )}
                      <p className="truncate text-center text-[10px] text-faint">
                        {!changed
                          ? 'keep'
                          : from && from !== m.key
                            ? `from ${getCharacter(from)?.name}`
                            : 'swap in'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
            {b && (
              <p className="text-[11px] text-faint">
                {setSummary(
                  ARTIFACT_SLOTS.map((s) => artifacts.find((a) => a.id === b.pieces[s])?.setKey),
                )}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
