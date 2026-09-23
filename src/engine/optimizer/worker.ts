// Runs the optimizer off the main thread so the UI never freezes.

import { optimize, type OptimizeInput } from './optimize'

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<{ id: number; input: OptimizeInput }>) => void) | null
  postMessage: (message: unknown) => void
}

scope.onmessage = ({ data: { id, input } }) => {
  try {
    scope.postMessage({ id, result: optimize(input) })
  } catch (e) {
    scope.postMessage({ id, error: (e as Error).message })
  }
}
