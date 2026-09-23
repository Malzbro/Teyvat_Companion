import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from './cn'

interface CountFieldProps {
  value: number
  onChange: (value: number) => void
  label: string
  className?: string
}

/** Compact − [typed number] + for item counts (Mora can be in the millions, so typing matters). */
export function CountField({ value, onChange, label, className }: CountFieldProps) {
  // While typing, show her draft; otherwise the live value.
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const n = Number(draft.replace(/[^\d]/g, ''))
    if (draft.trim() && Number.isFinite(n) && n !== value) onChange(n)
    setDraft(null)
  }
  const btn =
    'grid size-9 shrink-0 place-items-center rounded-full text-ink transition hover:bg-surface-strong active:scale-90 disabled:opacity-30'

  return (
    <div className={cn('flex items-center rounded-full border border-line bg-surface', className)}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`One less ${label}`}
      >
        <Minus size={15} strokeWidth={2.5} />
      </button>
      <input
        inputMode="numeric"
        value={draft ?? value.toLocaleString()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        onFocus={(e) => {
          setDraft(String(value))
          e.target.select()
        }}
        aria-label={`${label} owned`}
        className="w-20 bg-transparent text-center text-sm font-bold tabular-nums focus:outline-none"
      />
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        aria-label={`One more ${label}`}
      >
        <Plus size={15} strokeWidth={2.5} />
      </button>
    </div>
  )
}
