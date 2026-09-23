// JSON backup: export every table to one file and restore it later.

import type { AppDatabase } from '.'
import type {
  Artifact,
  Build,
  Goal,
  MaterialCount,
  OwnedCharacter,
  OwnedWeapon,
  Setting,
  Team,
  TeamComp,
} from './types'

const APP = 'teyvat-companion'
// v2 added builds and teamComps; v1 files still import (those tables start empty).
const FORMAT_VERSION = 2

export interface BackupFile {
  app: typeof APP
  formatVersion: number
  exportedAt: string
  data: {
    characters: OwnedCharacter[]
    weapons: OwnedWeapon[]
    artifacts: Artifact[]
    materials: MaterialCount[]
    goals: Goal[]
    teams: Team[]
    settings: Setting[]
    builds: Build[]
    teamComps: TeamComp[]
  }
}

const TABLES = [
  'characters',
  'weapons',
  'artifacts',
  'materials',
  'goals',
  'teams',
  'settings',
  'builds',
  'teamComps',
] as const

export async function exportData(db: AppDatabase): Promise<BackupFile> {
  const [characters, weapons, artifacts, materials, goals, teams, settings, builds, teamComps] =
    await Promise.all(TABLES.map((t) => db.table(t).toArray()))
  return {
    app: APP,
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      characters: characters as OwnedCharacter[],
      weapons: weapons as OwnedWeapon[],
      artifacts: artifacts as Artifact[],
      materials: materials as MaterialCount[],
      goals: goals as Goal[],
      teams: teams as Team[],
      settings: settings as Setting[],
      builds: builds as Build[],
      teamComps: teamComps as TeamComp[],
    },
  }
}

/** Replaces everything in the database with the backup. Throws a friendly error if the file is wrong. */
export async function importData(db: AppDatabase, backup: unknown): Promise<void> {
  const file = backup as Partial<BackupFile> | null
  if (!file || file.app !== APP || !file.data) {
    throw new Error("This file isn't a Teyvat Companion backup.")
  }
  if (typeof file.formatVersion !== 'number' || file.formatVersion > FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of the app.')
  }
  const data = file.data
  await db.transaction(
    'rw',
    TABLES.map((t) => db[t]),
    async () => {
      for (const t of TABLES) {
        await db.table(t).clear()
        await db.table(t).bulkAdd(data[t] ?? [])
      }
    },
  )
}

/** Browser helper: download the backup as a .json file. */
export async function downloadBackup(db: AppDatabase): Promise<void> {
  const backup = await exportData(db)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `teyvat-companion-backup-${backup.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Browser helper: read a backup file chosen by the user and import it. */
export async function restoreBackup(db: AppDatabase, file: File): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error("That file couldn't be read as a backup.")
  }
  await importData(db, parsed)
}
