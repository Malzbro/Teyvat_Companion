import { Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, WeaponIcon, cn } from '../../components'
import { getCharacter, getWeapon } from '../../data'
import { WEAPON_GUIDES } from '../../data/weaponGuides'
import type { OwnedCharacter, OwnedWeapon } from '../../db'
import { equipWeapon } from '../../db/roster'

const SHOWN = 5

interface WeaponPicksProps {
  me: OwnedCharacter
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
}

/** The guide's weapon ranking for this character, with the ones she owns ready to equip. */
export function WeaponPicks({ me, owned, weapons }: WeaponPicksProps) {
  const [showAll, setShowAll] = useState(false)
  const guide = WEAPON_GUIDES[me.key]
  if (!guide) return null

  // Her best copy of a weapon: the one she's wearing, else highest refinement, then level.
  const bestCopy = (key: string) =>
    weapons
      .filter((w) => w.key === key)
      .sort(
        (a, b) =>
          Number(b.id === me.weaponId) - Number(a.id === me.weaponId) ||
          b.refinement - a.refinement ||
          b.level - a.level,
      )[0]
  const ranked = guide.picks.map((pick, i) => ({ pick, rank: i + 1 }))
  const firstOwned = ranked.find(({ pick }) => pick.weapons.some((k) => bestCopy(k)))
  const shown = showAll ? ranked : ranked.slice(0, SHOWN)
  // Always show her best owned weapon, even when it's further down the list.
  if (!showAll && firstOwned && firstOwned.rank > SHOWN) shown.push(firstOwned)

  return (
    <div className="space-y-2">
      {shown.map(({ pick, rank }) => (
        <Card
          key={rank}
          className={cn('space-y-2 p-3', firstOwned?.rank === rank && 'border-mint/40')}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-accent tabular-nums">#{rank}</span>
            <p className="flex-1 text-xs text-muted">{pick.note}</p>
            {firstOwned?.rank === rank && (
              <span className="shrink-0 text-[11px] font-bold text-mint">Your best</span>
            )}
          </div>
          <PickWeapons weapons={pick.weapons} bestCopy={bestCopy} me={me} owned={owned} />
        </Card>
      ))}
      <div className="flex items-center justify-between gap-2">
        {ranked.length > SHOWN ? (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer' : `Show all ${ranked.length}`}
          </Button>
        ) : (
          <span />
        )}
        <a
          href={guide.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 items-center gap-1 px-2 text-xs text-muted underline-offset-2 hover:underline"
        >
          KQM guide <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

/**
 * One weapon, or a group ranked together. In a big group, weapons she doesn't own are shown
 * as a compact row of small icons so the list stays short on a phone.
 */
function PickWeapons({
  weapons,
  bestCopy,
  me,
  owned,
}: {
  weapons: string[]
  bestCopy: (key: string) => OwnedWeapon | undefined
  me: OwnedCharacter
  owned: OwnedCharacter[]
}) {
  const compact = weapons.length > 2
  const lines = compact ? weapons.filter((k) => bestCopy(k)) : weapons
  const others = compact ? weapons.filter((k) => !bestCopy(k)) : []
  return (
    <div className="space-y-1.5">
      {lines.length > 0 && (
        <ul className="space-y-1.5">
          {lines.map((key) => (
            <WeaponLine key={key} weaponKey={key} copy={bestCopy(key)} me={me} owned={owned} />
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <div className="flex items-start gap-2.5">
          <div className="flex shrink-0 -space-x-2">
            {others.slice(0, 4).map((k) => {
              const d = getWeapon(k)
              return d ? (
                <WeaponIcon
                  key={k}
                  weapon={d}
                  size={32}
                  className="rounded-xl opacity-50 ring-2 ring-surface-solid grayscale"
                />
              ) : null
            })}
          </div>
          <p className="min-w-0 text-[11px] leading-snug text-faint">
            {others.map((k) => getWeapon(k)?.name).join(', ')} · not owned
          </p>
        </div>
      )}
    </div>
  )
}

function WeaponLine({
  weaponKey,
  copy,
  me,
  owned,
}: {
  weaponKey: string
  copy?: OwnedWeapon
  me: OwnedCharacter
  owned: OwnedCharacter[]
}) {
  const [busy, setBusy] = useState(false)
  const data = getWeapon(weaponKey)
  if (!data) return null
  const equipped = !!copy && copy.id === me.weaponId
  const holder = copy && owned.find((c) => c.weaponId === copy.id && c.key !== me.key)

  async function equip() {
    if (!copy) return
    setBusy(true)
    try {
      await equipWeapon(me.key, copy.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-2.5">
      <WeaponIcon weapon={data} size={40} className={cn(!copy && 'opacity-40 grayscale')} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-bold', !copy && 'text-muted')}>{data.name}</p>
        <p className="truncate text-[11px] text-faint">
          {copy
            ? `Owned · R${copy.refinement} · Lv ${copy.level}${holder ? ` · on ${getCharacter(holder.key)?.name}` : ''}`
            : `${data.rarity}★ · not owned`}
        </p>
      </div>
      {equipped ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-xs font-bold text-mint">
          <Check size={13} /> Equipped
        </span>
      ) : copy ? (
        <Button size="sm" variant="secondary" onClick={equip} disabled={busy} className="shrink-0">
          {busy ? '…' : 'Equip'}
        </Button>
      ) : null}
    </li>
  )
}
