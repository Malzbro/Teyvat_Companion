import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './cn'

interface StepperProps {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Formats the displayed value, e.g. v => `C${v}`. */
  format?: (value: number) => ReactNode
  className?: string
}

/** − value + control with large tap targets. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  format,
  className,
}: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  const btn =
    'grid size-11 place-items-center rounded-full text-ink transition hover:bg-surface-strong active:scale-90 disabled:opacity-30'
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      {label && <span className="text-sm font-semibold text-muted">{label}</span>}
      <div className="flex items-center rounded-full border border-line bg-surface">
        <button
          type="button"
          className={btn}
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={label ? `Decrease ${label}` : 'Decrease'}
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>
        <output
          className="min-w-12 text-center text-base font-bold tabular-nums"
          aria-live="polite"
        >
          {format ? format(value) : value}
        </output>
        <button
          type="button"
          className={btn}
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={label ? `Increase ${label}` : 'Increase'}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
