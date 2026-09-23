import { Sparkle } from 'lucide-react'
import { phaseForLevel } from '../data'
import { Chip } from './Chip'
import { Stepper } from './Stepper'

interface LevelFieldProps {
  level: number
  ascension: number
  /** Level cap of each ascension phase, e.g. [20, 40, 50, 60, 70, 80, 90]. */
  caps: number[]
  /** Highest level allowed (defaults to the last cap). */
  maxLevel?: number
  onChange: (level: number, ascension: number) => void
}

/**
 * Level stepper with quick picks. At a level cap (e.g. 80/80 vs 80/90) an
 * "Ascended" toggle picks the ascension phase.
 */
export function LevelField({ level, ascension, caps, maxLevel, onChange }: LevelFieldProps) {
  const max = maxLevel ?? caps[caps.length - 1]
  const phase = phaseForLevel(level, caps)
  const atCap = caps.slice(0, -1).includes(level)
  const ascended = atCap && ascension > phase
  const setLevel = (l: number) => onChange(l, phaseForLevel(l, caps))
  const quick = [1, ...caps.slice(0, -1).filter((c) => c >= 20), caps[caps.length - 1]]

  return (
    <div className="space-y-2.5">
      <Stepper
        label="Level"
        value={level}
        onChange={setLevel}
        min={1}
        max={max}
        format={(v) => `${v}/${v > caps[caps.length - 1] ? max : caps[ascension]}`}
      />
      <div className="flex gap-1">
        {quick.map((l) => (
          <Chip
            key={l}
            selected={level === l}
            onClick={() => setLevel(l)}
            className="min-h-9 min-w-0 flex-1 justify-center px-0 tabular-nums"
          >
            {l}
          </Chip>
        ))}
      </div>
      {atCap && (
        <Chip
          selected={ascended}
          color="var(--mint)"
          className="min-h-8 px-3"
          onClick={() => onChange(level, ascended ? phase : phase + 1)}
        >
          <Sparkle size={14} /> Ascended
        </Chip>
      )}
    </div>
  )
}
