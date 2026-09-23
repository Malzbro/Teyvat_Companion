import { cn } from './cn'

interface ProgressBarProps {
  value: number
  max: number
  label?: string
  /** Show "have / need" on the right. */
  showCount?: boolean
  /** Bar colour (any CSS colour); turns mint when complete. */
  color?: string
  className?: string
}

export function ProgressBar({ value, max, label, showCount, color, className }: ProgressBarProps) {
  const done = max > 0 && value >= max
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const fill = done ? 'var(--mint)' : (color ?? 'var(--accent)')
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showCount) && (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          {label && <span className="font-semibold text-ink">{label}</span>}
          {showCount && (
            <span className={cn('tabular-nums', done ? 'font-bold text-mint' : 'text-muted')}>
              {value.toLocaleString()} / {max.toLocaleString()}
            </span>
          )}
        </div>
      )}
      <div
        className="h-2.5 overflow-hidden rounded-full bg-surface-strong"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, color-mix(in srgb, ${fill} 65%, white), ${fill})`,
          }}
        />
      </div>
    </div>
  )
}
