import { Check, Target } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button, CharacterAvatar } from '../../components'
import { getArtifactSet, getCharacter } from '../../data'
import { STAT_SHORT } from '../../data/stats'
import { ARTIFACT_RESIN_PER_DAY, RESIN_PER_DAY } from '../../config'
import { db, type TeamComp } from '../../db'
import { equipArtifact } from '../../db/artifacts'
import { trackTeam, untrackTeam } from '../../db/goals'
import { SLOT_LABELS } from '../../engine/artifact'
import type { ConditionState } from '../../engine/modifiers'
import { potentialInBackground } from '../../engine/optimizer'
import type { Potential, Upgrade } from '../../engine/teams/potential'

const SHOW = 8
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB')
const pct = (x: number) => `+${(x * 100).toFixed(1)}%`

/** "Optimise & track" on a team card (Step 22): max DPS, upgrades best value first, tracker. */
export function PotentialPanel({ team }: { team: TeamComp }) {
  const [result, setResult] = useState<Potential | 'loading' | 'error' | null>(null)
  const [all, setAll] = useState(false)
  const [equipped, setEquipped] = useState(false)

  async function run() {
    setResult('loading')
    try {
      const [owned, weapons, artifacts, settings, materials] = await Promise.all([
        db.characters.toArray(),
        db.weapons.toArray(),
        db.artifacts.toArray(),
        db.settings.filter((s) => s.key.startsWith('conditions:')).toArray(),
        db.materials.toArray(),
      ])
      const potential = await potentialInBackground({
        owned,
        weapons,
        artifacts,
        conditionsByKey: Object.fromEntries(
          settings.map((s) => [s.key.slice('conditions:'.length), s.value as ConditionState]),
        ),
        party: team.members.map((m) => m.characterKey),
        counts: Object.fromEntries(materials.map((m) => [m.id, m.count])),
      })
      await trackTeam(team.id, potential.targets)
      setResult(potential)
    } catch {
      setResult('error')
    }
  }

  async function equip(p: Potential) {
    for (const m of p.plan.members)
      for (const slot of m.build?.swaps ?? []) {
        const id = m.build!.pieces[slot]
        if (id) await equipArtifact(m.key, id)
      }
    setEquipped(true)
  }

  if (result === null || result === 'error')
    return (
      <div className="space-y-1">
        <Button block variant="secondary" onClick={run}>
          <Target size={16} /> {team.trackedAt ? 'Max DPS & what to farm' : 'Optimise & track'}
        </Button>
        {result === 'error' && (
          <p className="text-center text-xs text-danger">Something went wrong. Try again.</p>
        )}
      </div>
    )
  if (result === 'loading')
    return <p className="py-2 text-center text-sm text-muted">Working out this team’s max DPS…</p>

  const p = result
  const shown = all ? p.upgrades : p.upgrades.slice(0, SHOW)
  const gearSwaps = p.plan.members.some((m) => m.build?.swaps.length)
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Now" value={p.now} />
        <Stat label="Best gear" value={p.bestGear} />
        <Stat label="Max" value={p.max} accent />
      </div>
      <p className="text-xs text-muted">
        Max = Lv 90, the talents their rotation or buffs use at 10, weapons at Lv 90, your best
        artifacts levelled and the farm pieces below. Team DPS per 20 s cycle.
      </p>
      {gearSwaps && (
        <Button
          block
          size="sm"
          variant={equipped ? 'secondary' : 'primary'}
          disabled={equipped}
          onClick={() => equip(p)}
        >
          {equipped ? (
            <>
              <Check size={16} /> Best gear equipped
            </>
          ) : (
            'Equip the best gear you own'
          )}
        </Button>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-bold">Best value first</h3>
        {p.upgrades.length === 0 ? (
          <p className="text-xs text-muted">This team is already at its max.</p>
        ) : (
          <ol className="space-y-2.5">
            {shown.map((u) => (
              <UpgradeRow key={u.id} upgrade={u} />
            ))}
          </ol>
        )}
        {p.upgrades.length > SHOW && (
          <button
            type="button"
            onClick={() => setAll(!all)}
            className="text-xs font-bold text-accent"
          >
            {all ? 'Show fewer' : `Show all ${p.upgrades.length}`}
          </button>
        )}
      </section>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
        <Link
          to="/materials?view=team"
          onClick={() => window.scrollTo(0, 0)}
          className="font-bold text-mint"
        >
          <Check size={13} className="mr-1 inline" />
          Tracked in Materials → By team
        </Link>
        <button
          type="button"
          className="text-faint underline-offset-2 hover:underline"
          onClick={async () => {
            await untrackTeam(team.id)
            setResult(null)
          }}
        >
          Stop tracking
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-strong px-1 py-2">
      <p className="text-[10px] font-bold tracking-wider text-faint uppercase">{label}</p>
      <p className={accent ? 'font-bold text-accent tabular-nums' : 'font-bold tabular-nums'}>
        {fmt(value)}
      </p>
    </div>
  )
}

function costText(u: Upgrade) {
  if (u.kind === 'farm')
    return `about ${Math.max(1, Math.round(u.farm!.days))} days at ${ARTIFACT_RESIN_PER_DAY} resin`
  if (u.kind === 'artifactLevel') return 'artifact EXP only'
  if (!u.resin) return u.notCounted.length ? `no resin · ${u.notCounted.join(', ')}` : 'ready now'
  const days = Math.max(1, Math.ceil(u.resin / RESIN_PER_DAY))
  const extra = u.notCounted.length ? ` + ${u.notCounted.join(', ')}` : ''
  return `${u.resin.toLocaleString('en-GB')} resin, about ${days} ${days === 1 ? 'day' : 'days'}${extra}`
}

function UpgradeRow({ upgrade: u }: { upgrade: Upgrade }) {
  const c = getCharacter(u.characterKey)
  const setName = (k: string) => getArtifactSet(k)?.name ?? k
  const what =
    u.kind === 'farm'
      ? `Farm ${setName(u.farm!.setKey)} ${SLOT_LABELS[u.farm!.slot].toLowerCase()}, ${STAT_SHORT[u.farm!.mainStat]} with ${u.farm!.substats.map((k) => STAT_SHORT[k]).join(' + ')}`
      : u.kind === 'artifactLevel'
        ? `Level ${setName(u.artifact!.setKey)} ${SLOT_LABELS[u.artifact!.slot].toLowerCase()} +${u.artifact!.level} → +${u.label.split('+')[1]}`
        : u.label
  return (
    <li className="flex items-start gap-2">
      {c && <CharacterAvatar character={c} size={32} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 text-sm">
            <b>{c?.name}</b> <span className="text-muted">· {what}</span>
          </p>
          <span className="shrink-0 text-sm font-bold text-mint tabular-nums">{pct(u.gain)}</span>
        </div>
        <p className="text-xs text-faint">
          {u.kind === 'farm' && u.farm!.domain ? `${u.farm!.domain} · ` : ''}
          {costText(u)}
        </p>
      </div>
    </li>
  )
}
