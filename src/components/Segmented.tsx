import { cn } from './cn'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
}

/** Two or three mutually exclusive tabs inside one pill. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex rounded-full border border-line bg-surface p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-10 flex-1 rounded-full text-sm font-bold transition duration-200',
            o.value === value
              ? 'bg-surface-strong text-ink shadow-soft'
              : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
