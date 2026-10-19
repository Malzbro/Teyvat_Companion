// Runs the optimizer off the main thread so the UI never freezes.

import { planTeam, suggestTeams } from '../teams/suggest'
import { optimize } from './optimize'

type Job =
  | { id: number; kind: 'optimize'; input: Parameters<typeof optimize>[0] }
  | { id: number; kind: 'suggest'; input: Parameters<typeof suggestTeams>[0] }
  | { id: number; kind: 'plan'; input: Parameters<typeof planTeam>[0] }

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<Job>) => void) | null
  postMessage: (message: unknown) => void
}

scope.onmessage = ({ data }) => {
  try {
    const result =
      data.kind === 'optimize'
        ? optimize(data.input)
        : data.kind === 'suggest'
          ? suggestTeams(data.input)
          : planTeam(data.input)
    scope.postMessage({ id: data.id, result })
  } catch (e) {
    scope.postMessage({ id: data.id, error: (e as Error).message })
  }
}
