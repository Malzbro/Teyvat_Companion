import { cn } from './cn'

interface ScoreBadgeProps {
  /** 0–100. */
  score: number
  label?: string
  size?: number
  className?: string
}

function tone(score: number) {
  if (score >= 80) return 'var(--mint)'
  if (score >= 55) return 'var(--accent)'
  return 'var(--text-muted)'
}

/** Ring showing a 0–100 build score. */
export function ScoreBadge({ score, label = 'Score', size = 64, className }: ScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(clamped)} out of 100`}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-strong)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={tone(clamped)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="font-display font-bold tabular-nums" style={{ fontSize: size * 0.3 }}>
        {Math.round(clamped)}
      </span>
    </div>
  )
}
