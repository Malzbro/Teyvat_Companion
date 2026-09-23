import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  CharacterAvatar,
  Chip,
  ElementBadge,
  LevelField,
  Sheet,
  Stepper,
  WeaponIcon,
} from '../../components'
import { getCharacter, getWeapon, levelCaps } from '../../data'
import {
  newId,
  type Goal,
  type OwnedCharacter,
  type OwnedWeapon,
  type TalentLevels,
} from '../../db'
import { removeGoal, saveGoal } from '../../db/goals'
import { GOAL_MAX_LEVEL } from '../../engine/materials'

type View = 'pick' | 'form' | 'remove'

interface GoalSheetProps {
  existing?: Goal
  owned: OwnedCharacter[]
  weapons: OwnedWeapon[]
  goals: Goal[]
  /** Start straight on this character (from the character page). */
  initialCharacter?: string
  onClose: () => void
}

const TALENTS = [
  ['normal', 'Normal Attack'],
  ['skill', 'Elemental Skill'],
  ['burst', 'Elemental Burst'],
] as const

export function GoalSheet({
  existing,
  owned,
  weapons,
  goals,
  initialCharacter,
  onClose,
}: GoalSheetProps) {
  const start = existing?.characterKey ?? initialCharacter ?? ''
  const startTalents = owned.find((c) => c.key === start)?.talents
  const [view, setView] = useState<View>(start ? 'form' : 'pick')
  const [characterKey, setCharacterKey] = useState(start)
  const [targetLevel, setTargetLevel] = useState(existing?.targetLevel ?? GOAL_MAX_LEVEL)
  const [targetAscension, setTargetAscension] = useState(existing?.targetAscension ?? 6)
  const [targetTalents, setTargetTalents] = useState<TalentLevels | null>(
    existing?.targetTalents ?? startTalents ?? null,
  )
  const [includeWeapon, setIncludeWeapon] = useState(!!existing?.weapon)
  const [weaponTarget, setWeaponTarget] = useState(
    existing?.weapon ?? { weaponId: '', targetLevel: GOAL_MAX_LEVEL, targetAscension: 6 },
  )
  const [error, setError] = useState('')

  const current = owned.find((c) => c.key === characterKey)
  const data = getCharacter(characterKey)
  const weapon = current?.weaponId ? weapons.find((w) => w.id === current.weaponId) : undefined
  const weaponData = weapon && getWeapon(weapon.key)
  const talents = targetTalents ?? current?.talents ?? { normal: 1, skill: 1, burst: 1 }

  function pick(key: string) {
    const c = owned.find((o) => o.key === key)!
    setCharacterKey(key)
    setTargetTalents(c.talents)
    setView('form')
  }

  async function save() {
    if (!current) return
    try {
      await saveGoal({
        id: existing?.id ?? newId(),
        characterKey,
        targetLevel,
        targetAscension,
        targetTalents: talents,
        weapon:
          includeWeapon && weapon
            ? {
                weaponId: weapon.id,
                targetLevel: weaponTarget.targetLevel,
                targetAscension: weaponTarget.targetAscension,
              }
            : undefined,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const withGoal = new Set(goals.map((g) => g.characterKey))
  const candidates = owned
    .filter((c) => !withGoal.has(c.key))
    .map((c) => ({ c, data: getCharacter(c.key)! }))
    .filter(({ data }) => data)
    .sort(
      (a, b) =>
        Number(b.c.favourite) - Number(a.c.favourite) || a.data.name.localeCompare(b.data.name),
    )

  const title =
    view === 'pick' ? 'New goal' : view === 'remove' ? 'Delete goal?' : `${data?.name ?? ''} goal`

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        view === 'form' && (
          <div className="space-y-2">
            {error && <p className="text-center text-sm text-danger">{error}</p>}
            <Button block size="lg" onClick={save}>
              {existing ? 'Save goal' : 'Create goal'}
            </Button>
          </div>
        )
      }
    >
      {view === 'pick' && (
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              {owned.length
                ? 'Every character already has a goal.'
                : 'Add characters in the Roster first.'}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {candidates.map(({ c, data }) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => pick(c.key)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-strong active:scale-[0.98]"
                  >
                    <CharacterAvatar character={data} size={48} />
                    <span className="flex-1">
                      <span className="block font-bold">{data.name}</span>
                      <span className="text-sm text-muted tabular-nums">
                        Lv. {c.level} · {c.talents.normal}/{c.talents.skill}/{c.talents.burst}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view === 'form' && data && current && (
        <div className="space-y-5">
          {!existing && !initialCharacter && (
            <button
              type="button"
              onClick={() => setView('pick')}
              className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-bold text-muted hover:text-ink"
            >
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <div className="flex items-center gap-3">
            <CharacterAvatar character={data} size={56} />
            <div className="space-y-1">
              <ElementBadge element={data.element} />
              <p className="text-sm text-muted tabular-nums">
                Now Lv. {current.level} · Talents {current.talents.normal}/{current.talents.skill}/
                {current.talents.burst}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">
              Target level
            </h3>
            <LevelField
              level={targetLevel}
              ascension={targetAscension}
              caps={levelCaps(data)}
              maxLevel={GOAL_MAX_LEVEL}
              onChange={(l, a) => {
                setTargetLevel(l)
                setTargetAscension(a)
              }}
            />
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">
              Target talents
            </h3>
            {TALENTS.map(([k, label]) => (
              <Stepper
                key={k}
                label={label}
                value={talents[k]}
                onChange={(v) => setTargetTalents({ ...talents, [k]: v })}
                min={current.talents[k]}
                max={10}
              />
            ))}
          </div>

          {weapon && weaponData && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <WeaponIcon weapon={weaponData} size={44} />
                <div className="flex-1">
                  <p className="font-bold">{weaponData.name}</p>
                  <p className="text-sm text-muted">Now Lv. {weapon.level}</p>
                </div>
                <Chip selected={includeWeapon} onClick={() => setIncludeWeapon(!includeWeapon)}>
                  {includeWeapon ? 'Included' : 'Include'}
                </Chip>
              </div>
              {includeWeapon && (
                <LevelField
                  level={weaponTarget.targetLevel}
                  ascension={weaponTarget.targetAscension}
                  caps={levelCaps(weaponData)}
                  onChange={(l, a) =>
                    setWeaponTarget({ ...weaponTarget, targetLevel: l, targetAscension: a })
                  }
                />
              )}
            </div>
          )}

          <p className="text-xs text-faint">
            Current levels come from the Roster. Goals go up to Lv {GOAL_MAX_LEVEL}.
          </p>

          {existing && (
            <Button variant="ghost" block className="text-danger" onClick={() => setView('remove')}>
              Delete goal
            </Button>
          )}
        </div>
      )}

      {view === 'remove' && existing && (
        <div className="space-y-4 pb-2">
          <p className="text-muted">
            The goal will be deleted. Your material counts stay as they are.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setView('form')}>
              Cancel
            </Button>
            <Button
              variant="danger"
              block
              onClick={async () => {
                await removeGoal(existing.id)
                onClose()
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
