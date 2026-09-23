import type { Element } from '../data/types'
import { cn } from './cn'
import { elementColor } from './element'

/** Simple original element glyphs (not official game art). */
const glyphs: Record<Element, string> = {
  Pyro: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 3 0-3 0-6 1-8.5z',
  Hydro: 'M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10z',
  Electro: 'M13 3 6 13.5h5L10 21l8-11h-5.2L13 3z',
  Cryo: 'M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  Anemo: 'M4 9h10a3 3 0 1 0-3-3M4 13h14a3 3 0 1 1-3 3M4 17h6',
  Geo: 'M12 3 20 8v8l-8 5-8-5V8l8-5zm0 4-4 2.5v5L12 17l4-2.5v-5L12 7z',
  Dendro: 'M6 18C6 10 11 5 19 5c0 8-5 13-13 13zm0 0 7-7',
}

const stroked = new Set<Element>(['Cryo', 'Anemo', 'Dendro'])

export function ElementIcon({ element, size = 16 }: { element: Element; size?: number }) {
  const s = stroked.has(element)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      fill={s ? 'none' : 'currentColor'}
      stroke={s ? 'currentColor' : 'none'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillRule="evenodd"
    >
      <path d={glyphs[element]} />
    </svg>
  )
}

interface ElementBadgeProps {
  element: Element
  /** Only the round icon, no label. */
  iconOnly?: boolean
  className?: string
}

export function ElementBadge({ element, iconOnly, className }: ElementBadgeProps) {
  const color = elementColor(element)
  const tint = { color, backgroundColor: `color-mix(in srgb, ${color} 17%, transparent)` }
  if (iconOnly)
    return (
      <span
        className={cn('inline-grid size-7 place-items-center rounded-full', className)}
        style={tint}
        title={element}
        role="img"
        aria-label={element}
      >
        <ElementIcon element={element} size={15} />
      </span>
    )
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2 text-xs font-bold tracking-wide',
        className,
      )}
      style={tint}
    >
      <ElementIcon element={element} size={14} />
      {element}
    </span>
  )
}
