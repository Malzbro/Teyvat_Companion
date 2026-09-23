import { Dexie, type EntityTable } from 'dexie'
import type {
  Artifact,
  Goal,
  MaterialCount,
  OwnedCharacter,
  OwnedWeapon,
  Setting,
  Team,
} from './types'

export type * from './types'

export class AppDatabase extends Dexie {
  characters!: EntityTable<OwnedCharacter, 'key'>
  weapons!: EntityTable<OwnedWeapon, 'id'>
  artifacts!: EntityTable<Artifact, 'id'>
  materials!: EntityTable<MaterialCount, 'id'>
  goals!: EntityTable<Goal, 'id'>
  teams!: EntityTable<Team, 'characterKey'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'teyvat-companion') {
    super(name)
    this.version(1).stores({
      characters: 'key',
      weapons: 'id, key',
      artifacts: 'id, setKey, slot',
      materials: 'id',
      goals: 'id, characterKey',
      teams: 'characterKey',
      settings: 'key',
    })
  }
}

export const db = new AppDatabase()

export const newId = () => crypto.randomUUID()

export { exportData, importData, type BackupFile } from './backup'
