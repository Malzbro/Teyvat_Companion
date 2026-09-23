import { Bookmark, Check, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Sheet, WeaponIcon, cn } from '../../components'
import { getArtifactSet, getWeapon, iconUrl } from '../../data'
import type { Artifact, Build, OwnedCharacter, OwnedWeapon, TeamComp } from '../../db'
import { equipBuild, isWearing, newBuild, removeBuild, saveBuild } from '../../db/builds'
import { ARTIFACT_SLOTS } from '../../engine/artifact'
import { setSummary } from '../../engine/setSummary'

interface SavedBuildsProps {
  me: OwnedCharacter
  builds: Build[]
  artifacts: Artifact[]
  weapons: OwnedWeapon[]
  teams: TeamComp[]
}

type Editing = { kind: 'new' } | { kind: 'edit'; build: Build }

/** Her saved loadouts for this character: save the current gear, equip one, rename or delete. */
export function SavedBuilds({ me, builds, artifacts, weapons, teams }: SavedBuildsProps) {
  const [editing, setEditing] = useState<Editing | null>(null)
  const wearing = builds.find((b) => isWearing(me, b))

  return (
    <div className="space-y-2">
      {builds.map((b) => (
        <BuildRow
          key={b.id}
          build={b}
          worn={b === wearing}
          artifacts={artifacts}
          weapons={weapons}
          teamCount={teams.filter((t) => t.members.some((m) => m.buildId === b.id)).length}
          onMore={() => setEditing({ kind: 'edit', build: b })}
        />
      ))}
      {!wearing && (
        <Button variant="secondary" block onClick={() => setEditing({ kind: 'new' })}>
          <Bookmark size={16} /> Save current gear as a build
        </Button>
      )}
      {builds.length === 0 && (
        <p className="text-xs text-faint">
          Builds let one character keep several loadouts (say “Main DPS” and “Support”) and switch
          between them — or pick one per team on the Teams page.
        </p>
      )}

      {editing && (
        <BuildSheet
          me={me}
          editing={editing}
          defaultName={`Build ${builds.length + 1}`}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function BuildRow({
  build,
  worn,
  artifacts,
  weapons,
  teamCount,
  onMore,
}: {
  build: Build
  worn: boolean
  artifacts: Artifact[]
  weapons: OwnedWeapon[]
  teamCount: number
  onMore: () => void
}) {
  const [busy, setBusy] = useState(false)
  const weapon = weapons.find((w) => w.id === build.weaponId)
  const weaponData = weapon && getWeapon(weapon.key)
  const pieces = ARTIFACT_SLOTS.map((s) => artifacts.find((a) => a.id === build.artifactIds[s]))

  async function equip() {
    setBusy(true)
    try {
      await equipBuild(build)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={cn('space-y-2.5 p-3', worn && 'border-mint/40')}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{build.name}</p>
          <p className="truncate text-xs text-muted">
            {setSummary(pieces.map((p) => p?.setKey))}
            {teamCount > 0 && ` · in ${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`}
          </p>
        </div>
        {worn ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-xs font-bold text-mint">
            <Check size={13} /> Equipped
          </span>
        ) : (
          <Button size="sm" onClick={equip} disabled={busy}>
            {busy ? 'Equipping…' : 'Equip'}
          </Button>
        )}
        <button
          type="button"
          onClick={onMore}
          aria-label={`Edit ${build.name}`}
          className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-strong"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {weaponData ? (
          <WeaponIcon weapon={weaponData} size={36} />
        ) : (
          <span className="size-9 rounded-xl border border-dashed border-line" />
        )}
        {pieces.map((p, i) => {
          const set = p && getArtifactSet(p.setKey)
          return set ? (
            <img
              key={i}
              src={iconUrl(set.icons[p.slot])}
              alt=""
              className="size-9 rounded-xl bg-surface-strong"
              loading="lazy"
            />
          ) : (
            <span key={i} className="size-9 rounded-xl border border-dashed border-line" />
          )
        })}
      </div>
    </Card>
  )
}

function BuildSheet({
  me,
  editing,
  defaultName,
  onClose,
}: {
  me: OwnedCharacter
  editing: Editing
  defaultName: string
  onClose: () => void
}) {
  const existing = editing.kind === 'edit' ? editing.build : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    await saveBuild(
      existing ? { ...existing, name: name || existing.name } : newBuild(me, name || defaultName),
    )
    onClose()
  }

  async function replaceWithCurrent() {
    if (!existing) return
    await saveBuild({
      ...existing,
      name: name || existing.name,
      weaponId: me.weaponId,
      artifactIds: { ...me.artifactIds },
    })
    onClose()
  }

  async function remove() {
    if (existing) await removeBuild(existing.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={confirmDelete ? 'Delete build?' : existing ? 'Edit build' : 'Save build'}
      footer={
        !confirmDelete && (
          <Button block size="lg" onClick={save}>
            Save
          </Button>
        )
      }
    >
      {confirmDelete ? (
        <div className="space-y-4 pb-2">
          <p className="text-muted">
            The build is deleted; the gear stays where it is. Teams using it switch to “Equipped
            gear”.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" block onClick={remove}>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={existing?.name ?? defaultName}
              maxLength={30}
              autoFocus={!existing}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none placeholder:text-faint focus:border-accent"
            />
          </label>
          {!existing && (
            <p className="text-sm text-muted">Saves the weapon and artifacts equipped right now.</p>
          )}
          {existing && (
            <>
              <Button variant="secondary" block onClick={replaceWithCurrent}>
                Replace with current gear
              </Button>
              <Button
                variant="ghost"
                block
                className="text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                Delete build
              </Button>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
