import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronDown, Pin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CharacterAvatar, Segmented, cn } from '../../components'
import { getArtifactSet, getCharacter } from '../../data'
import { db, type Artifact, type OwnedCharacter, type OwnedWeapon } from '../../db'
import { applyTeamPlan } from '../../db/optimise'
import type { ConditionState } from '../../engine/modifiers'
import { adviceInBackground, allTeamsInBackground } from '../../engine/optimizer'
import type { Advice, AdviceInput } from '../../engine/teams/advice'
import { STAT_SHORT } from '../../data/stats'
import { SLOT_LABELS } from '../../engine/artifact'
import { ARTIFACT_RESIN_PER_DAY } from '../../config'
import type { AllTeamsResult, RankedTeam } from '../../engine/teams/allTeams'
import type { TeamPlan } from '../../engine/teams/suggest'
import { ResonanceBadges } from '../character/TeamPicker'
import { partyResonances } from '../teams/party'
import { Gear } from './OptimiseScreen'

const PAGE = 10
/** Top "best gear" teams that get the level/farm list (your saved teams always do). */
const ADVICE_TOP = 3
const section = 'text-xs font-bold tracking-[0.18em] text-faint uppercase'
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB')

type Gearing = 'now' | 'best'

/** Every team of four she can make, ranked by total DPS (Step 20). */
export function AllTeams({
  owned,
  weapons,
  artifacts,
}: {
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  artifacts: Artifact[]
}) {
  const teamComps = useLiveQuery(() => db.teamComps.toArray(), [])
  const settings = useLiveQuery(
    () => db.settings.filter((s) => s.key.startsWith('conditions:')).toArray(),
    [],
  )
  const [gearing, setGearing] = useState<Gearing>('now')
  const [shown, setShown] = useState(PAGE)

  const input = useMemo(() => {
    if (!teamComps || !settings) return null
    return {
      owned,
      weapons,
      artifacts,
      conditionsByKey: Object.fromEntries(
        settings.map((s) => [s.key.slice('conditions:'.length), s.value as ConditionState]),
      ),
      pinned: teamComps.map((t) => ({ name: t.name, keys: t.members.map((m) => m.characterKey) })),
    }
  }, [owned, weapons, artifacts, teamComps, settings])
  const inputKey = useMemo(() => JSON.stringify(input), [input])
  const [result, setResult] = useState<{ key: string; value?: AllTeamsResult; error?: string }>()
  useEffect(() => {
    if (!input) return
    let cancelled = false
    allTeamsInBackground(input)
      .then((value) => !cancelled && setResult({ key: inputKey, value }))
      .catch((e: Error) => !cancelled && setResult({ key: inputKey, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [input, inputKey])

  const value = result?.value
  const loading = !result || result.key !== inputKey
  const list = value ? (gearing === 'now' ? value.now : value.best) : []
  const top = list.slice(0, shown)
  const pinned = list.filter((t, i) => t.pinned && i >= shown)

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Every team of four you can make, ranked by total DPS: all four members’ rotations with their
        team’s buffs, resonance and reactions.
      </p>
      <Segmented
        label="Gear"
        value={gearing}
        onChange={(g) => {
          setGearing(g)
          setShown(PAGE)
        }}
        options={[
          { value: 'now', label: 'Gear you wear now' },
          { value: 'best', label: 'Best from your artifacts' },
        ]}
      />
      {gearing === 'best' && (
        <p className="text-xs text-faint">
          The strongest {value?.best.length ?? 20} teams with gear re-planned from your artifacts
          (no piece used twice; the biggest damage dealer picks first).
        </p>
      )}

      {result?.error ? (
        <p className="text-sm text-danger">{result.error}</p>
      ) : !value ? (
        <Card className="text-sm text-muted">Trying every team you can make…</Card>
      ) : (
        <div className={cn('space-y-5 transition-opacity', loading && 'opacity-60')}>
          <section className="space-y-3">
            <h2 className={section}>Top teams</h2>
            {top.map((t, i) => (
              <TeamRow
                key={`${gearing}-${t.members.map((m) => m.key).join(',')}`}
                rank={i + 1}
                team={t}
                gearing={gearing}
                owned={owned}
                artifacts={artifacts}
                adviceBase={gearing === 'best' && (i < ADVICE_TOP || t.pinned) ? input : null}
              />
            ))}
            {shown < list.length && (
              <Button block variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                Show more
              </Button>
            )}
          </section>

          {(pinned.length > 0 || value.pinnedRanks.some((p) => p.rank === null)) && (
            <section className="space-y-3">
              <h2 className={section}>Your saved teams</h2>
              {pinned.map((t) => (
                <TeamRow
                  key={`pin-${gearing}-${t.pinned}`}
                  rank={list.indexOf(t) + 1}
                  team={t}
                  gearing={gearing}
                  owned={owned}
                  artifacts={artifacts}
                  adviceBase={gearing === 'best' ? input : null}
                />
              ))}
            </section>
          )}
          <p className="text-xs text-faint">
            Checked {fmt(value.checked)} teams in {(value.ms / 1000).toFixed(1)} s. Healing, shields
            and energy aren’t counted, so check a team is comfortable to play.
          </p>
        </div>
      )}
    </div>
  )
}

function TeamRow({
  rank,
  team,
  gearing,
  owned,
  artifacts,
  adviceBase,
}: {
  rank: number
  team: RankedTeam & { plan?: TeamPlan; nowDps?: number }
  gearing: Gearing
  owned: OwnedCharacter[]
  artifacts: Artifact[]
  adviceBase: Omit<AdviceInput, 'party' | 'plan'> | null
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const keys = team.members.map((m) => m.key)
  const names = keys.map((k) => getCharacter(k)?.name ?? k)
  const gain = team.nowDps ? (team.dps / team.nowDps - 1) * 100 : null

  async function use() {
    setState('busy')
    try {
      await applyTeamPlan(
        names.slice(0, 2).join(' & ') + ' team',
        keys,
        team.plan ?? { members: [], ms: 0 },
      )
      setState('done')
    } catch {
      setState('idle')
    }
  }

  return (
    <Card className={cn('space-y-3', rank === 1 && 'border-accent/40')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-bold tracking-wider text-accent uppercase">
            #{rank}
            {team.pinned && (
              <span className="inline-flex items-center gap-0.5 text-mint normal-case">
                <Pin size={11} /> {team.pinned}
              </span>
            )}
          </p>
          <p className="truncate font-bold">{names.join(' · ')}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-semibold tabular-nums">{fmt(team.dps)}</p>
          <p className="text-[10px] text-faint">
            team DPS
            {gain !== null && gain > 0.05 && (
              <span className="text-mint"> · +{gain.toFixed(1)}%</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {team.members.map((m) => {
          const c = getCharacter(m.key)
          return (
            <div key={m.key} className="flex min-w-0 flex-col items-center gap-0.5">
              {c && <CharacterAvatar character={c} size={48} />}
              <span className="w-full truncate text-center text-xs font-bold">{c?.name}</span>
              <span className="text-[10px] text-muted tabular-nums">{fmt(m.dps)}</span>
            </div>
          )
        })}
      </div>
      <ResonanceBadges active={partyResonances(keys)} onlyActive />

      {gearing === 'best' && team.plan && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between text-sm font-semibold"
          >
            Gear for this team
            <ChevronDown size={18} className={cn('transition', open && 'rotate-180')} />
          </button>
          {open && <Gear plan={team.plan} owned={owned} artifacts={artifacts} />}
        </>
      )}

      {adviceBase && <AdvicePanel base={adviceBase} party={keys} plan={team.plan} />}

      <Button
        block
        variant={state === 'done' ? 'secondary' : rank === 1 ? 'primary' : 'secondary'}
        onClick={use}
        disabled={state === 'busy'}
      >
        {state === 'busy' ? (
          'Setting up…'
        ) : state === 'done' ? (
          <>
            <Check size={16} /> Team ready
          </>
        ) : gearing === 'best' ? (
          'Use this team and gear'
        ) : (
          'Use this team'
        )}
      </Button>
    </Card>
  )
}

const pctText = (x: number) => `+${(x * 100).toFixed(1)}%`

/** "Level these" and "Farm these" for one team (Step 21). */
function AdvicePanel({
  base,
  party,
  plan,
}: {
  base: Omit<AdviceInput, 'party' | 'plan'>
  party: string[]
  plan?: TeamPlan
}) {
  const [advice, setAdvice] = useState<Advice | 'loading' | null>(null)
  async function load() {
    setAdvice('loading')
    try {
      setAdvice(await adviceInBackground({ ...base, party, plan }))
    } catch {
      setAdvice(null)
    }
  }
  if (advice === null)
    return (
      <Button block variant="secondary" onClick={load}>
        What to level &amp; farm
      </Button>
    )
  if (advice === 'loading')
    return <p className="py-2 text-center text-sm text-muted">Working out the best upgrades…</p>
  const name = (k: string) => getCharacter(k)?.name ?? k
  const setName = (k: string) => getArtifactSet(k)?.name ?? k
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-3">
      <section className="space-y-2">
        <h3 className="text-sm font-bold">Level these</h3>
        {advice.levelUps.length === 0 ? (
          <p className="text-xs text-muted">
            Nothing worth levelling: the gear is maxed or won’t help.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {advice.levelUps.map((l) => (
              <li key={l.artifact.id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-muted">
                  <b className="text-ink">{name(l.characterKey)}</b> · {setName(l.artifact.setKey)}{' '}
                  {SLOT_LABELS[l.artifact.slot].toLowerCase()} ({STAT_SHORT[l.artifact.mainStat]}) +
                  {l.artifact.level} → +{l.toLevel}
                </span>
                <span className="shrink-0 font-bold text-mint tabular-nums">
                  {l.max - l.min < 0.001
                    ? pctText(l.min)
                    : `${pctText(l.min)}–${(l.max * 100).toFixed(1)}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-bold">Farm these</h3>
        {advice.farm.length === 0 ? (
          <p className="text-xs text-muted">No farm target adds more than 0.5% to this team.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {advice.farm.map((f) => (
              <li key={`${f.characterKey}-${f.slot}`} className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 text-muted">
                    <b className="text-ink">{name(f.characterKey)}</b> · {setName(f.setKey)}{' '}
                    {SLOT_LABELS[f.slot].toLowerCase()}, {STAT_SHORT[f.mainStat]} with{' '}
                    {f.substats.map((k) => STAT_SHORT[k]).join(' + ')}
                  </span>
                  <span className="shrink-0 font-bold text-mint tabular-nums">
                    {pctText(f.gain)}
                  </span>
                </div>
                <p className="text-xs text-faint">
                  {f.domain ?? 'No domain'} · about {Math.max(1, Math.round(f.days))}{' '}
                  {Math.round(f.days) === 1 ? 'day' : 'days'} at {ARTIFACT_RESIN_PER_DAY} resin a
                  day
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-[11px] text-faint">
        Gains are to this team’s total DPS. Levelling: the main stat is exact; the range runs from
        no useful substat rolls to every roll landing on the best one. Farm targets assume two
        average rolls in each named substat; days are the average wait for one, best value first.
      </p>
    </div>
  )
}
