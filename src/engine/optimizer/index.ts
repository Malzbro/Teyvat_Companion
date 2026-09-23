// Optimizer entry point for the UI: runs in a Web Worker when available.

import type { OwnedCharacter } from '../../db/types'
import { optimize, type OptimizeInput, type OptimizeResult } from './optimize'

export type { OptimizeInput, OptimizeResult, SuggestedBuild } from './optimize'
export { optimize } from './optimize'
export { scoreParts } from './score'

let worker: Worker | null = null
let nextId = 0
const pending = new Map<
  number,
  { resolve: (r: OptimizeResult) => void; reject: (e: Error) => void }
>()

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({
      data,
    }: MessageEvent<{ id: number; result?: OptimizeResult; error?: string }>) => {
      const job = pending.get(data.id)
      pending.delete(data.id)
      if (data.error) job?.reject(new Error(data.error))
      else job?.resolve(data.result!)
    }
  }
  return worker
}

/** Finds the best builds without blocking the page. */
export function optimizeInBackground(input: OptimizeInput): Promise<OptimizeResult> {
  const w = getWorker()
  if (!w) return Promise.resolve().then(() => optimize(input))
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ id, input })
  })
}

/** Artifacts worn by other characters who have their gear locked. */
export function lockedArtifactIds(characterKey: string, owned: OwnedCharacter[]): string[] {
  return owned
    .filter((c) => c.locked && c.key !== characterKey)
    .flatMap((c) => Object.values(c.artifactIds))
    .filter((id): id is string => !!id)
}
