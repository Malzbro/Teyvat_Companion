import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  /** Tint colour when selected (any CSS colour); defaults to the accent. */
  color?: string
}

/** A small pill; toggleable when given onClick. */
export function Chip({ selected, color, className, style, type = 'button', ...props }: ChipProps) {
  const tint = color ?? 'var(--accent)'
  return (
    <button
      type={type}
      aria-pressed={props.onClick ? !!selected : undefined}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition duration-150 select-none active:scale-95',
        selected ? 'text-ink' : 'border-line bg-surface text-muted hover:text-ink',
        className,
      )}
      style={
        selected
          ? {
              borderColor: `color-mix(in srgb, ${tint} 60%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${tint} 18%, transparent)`,
              ...style,
            }
          : style
      }
      {...props}
    />
  )
}
