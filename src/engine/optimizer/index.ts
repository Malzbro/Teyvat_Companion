// Optimizer entry point for the UI: runs in a Web Worker when available.

import type { OwnedCharacter } from '../../db/types'
import { optimize, type OptimizeInput, type OptimizeResult } from './optimize'
import {
  planTeam,
  suggestTeams,
  type SuggestInput,
  type SuggestResult,
  type TeamPlan,
} from '../teams/suggest'
import type { RotationInput, RotationResult } from '../rotations/damage'
import type { AllTeamsInput, AllTeamsResult } from '../teams/allTeams'
import type { Advice, AdviceInput } from '../teams/advice'
import type { Potential, PotentialInput } from '../teams/potential'

export type { OptimizeInput, OptimizeResult, SuggestedBuild } from './optimize'
export { optimize } from './optimize'
export { scoreParts } from './score'
export type {
  MemberPlan,
  SuggestInput,
  SuggestResult,
  TeamPlan,
  TeamSuggestion,
} from '../teams/suggest'

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve: (r: never) => void; reject: (e: Error) => void }>()

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({
      data,
    }: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
      const job = pending.get(data.id)
      pending.delete(data.id)
      if (data.error) job?.reject(new Error(data.error))
      else job?.resolve(data.result as never)
    }
  }
  return worker
}

/** Runs a job in the worker, or on this thread where Workers don't exist (tests). */
function run<T>(
  kind: 'optimize' | 'suggest' | 'plan' | 'rotation' | 'allTeams' | 'advice' | 'potential',
  input: unknown,
  local: () => T | Promise<T>,
): Promise<T> {
  const w = getWorker()
  if (!w) return Promise.resolve().then(local)
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (r: never) => void, reject })
    w.postMessage({ id, kind, input })
  })
}

/** Finds the best builds without blocking the page. */
export const optimizeInBackground = (input: OptimizeInput): Promise<OptimizeResult> =>
  run('optimize', input, () => optimize(input))

/** Ranks teams for a character without blocking the page. */
export const suggestTeamsInBackground = (input: SuggestInput): Promise<SuggestResult> =>
  run('suggest', input, () => suggestTeams(input))

/**
 * A character's rotation damage (Step 18) in the worker, so the talent tables (~400 KB) stay out
 * of the main bundle. Without Workers (tests) the engine is loaded on demand.
 */
export const rotationInBackground = (input: RotationInput): Promise<RotationResult | null> =>
  run('rotation', input, () => import('../rotations/damage').then((m) => m.rotationDamage(input)))

/** Every team of four ranked by DPS (Step 20), off the main thread. */
export const allTeamsInBackground = (input: AllTeamsInput): Promise<AllTeamsResult> =>
  run('allTeams', input, () => import('../teams/allTeams').then((m) => m.rankAllTeams(input)))

/** What to level and farm for a team (Step 21), off the main thread. */
export const adviceInBackground = (input: AdviceInput): Promise<Advice> =>
  run('advice', input, () => import('../teams/advice').then((m) => m.artifactAdvice(input)))

/** A team's max DPS and the upgrades that get there (Step 22), off the main thread. */
export const potentialInBackground = (input: PotentialInput): Promise<Potential> =>
  run('potential', input, () => import('../teams/potential').then((m) => m.teamPotential(input)))

/** Best gear for a whole party without blocking the page. */
export const planTeamInBackground = (input: Parameters<typeof planTeam>[0]): Promise<TeamPlan> =>
  run('plan', input, () => planTeam(input))

/** Artifacts worn by other characters who have their gear locked. */
export function lockedArtifactIds(characterKey: string, owned: OwnedCharacter[]): string[] {
  return owned
    .filter((c) => c.locked && c.key !== characterKey)
    .flatMap((c) => Object.values(c.artifactIds))
    .filter((id): id is string => !!id)
}
