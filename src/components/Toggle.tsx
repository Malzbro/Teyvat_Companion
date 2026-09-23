import type { ReactNode } from 'react'
import { cn } from './cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
  className?: string
}

/** A full-width row with a switch; the whole row is the tap target. */
export function Toggle({ checked, onChange, label, description, icon, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition active:scale-[0.99]',
        className,
      )}
    >
      {icon && (
        <span className={cn('shrink-0', checked ? 'text-accent' : 'text-faint')}>{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-surface-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
