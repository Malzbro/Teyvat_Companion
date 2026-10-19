// Reaction tables from Genshin Optimizer (npm run build:reaction-data), approved in Step 19.

import reactionsJson from './generated/reactions.json'
import type { Element } from './types'

interface ReactionData {
  source: string
  /** Index = character level. */
  levelMultiplier: number[]
  additive: { aggravate: number; spread: number }
  transformative: { swirl: number; stellarswirl: number }
  moonsign: {
    cap: number
    rates: Record<Element, { stat: string; per: number; value: number }>
  }
}

export const REACTION_DATA = reactionsJson as ReactionData

export const levelMultiplier = (level: number) =>
  REACTION_DATA.levelMultiplier[
    Math.max(1, Math.min(level, REACTION_DATA.levelMultiplier.length - 1))
  ]
