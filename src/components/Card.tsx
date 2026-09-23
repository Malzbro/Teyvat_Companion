import type { HTMLAttributes } from 'react'
import type { Element } from '../data/types'
import { cn } from './cn'
import { elementColor } from './element'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a soft glow in the element's colour. */
  element?: Element
  /** Removes the inner padding (for edge-to-edge images). */
  flush?: boolean
  /** Makes the whole card a pressable surface. */
  interactive?: boolean
}

export function Card({ element, flush, interactive, className, style, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-line bg-surface shadow-soft backdrop-blur-xl',
        !flush && 'p-4',
        interactive &&
          'cursor-pointer transition duration-150 hover:bg-surface-strong active:scale-[0.98]',
        className,
      )}
      style={
        element
          ? {
              backgroundImage: `radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, ${elementColor(element)} 22%, transparent), transparent 70%)`,
              ...style,
            }
          : style
      }
      {...props}
    />
  )
}
