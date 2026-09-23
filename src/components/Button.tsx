import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-accent to-accent-strong text-accent-ink shadow-[0_8px_24px_-10px_var(--accent-strong)] hover:brightness-105',
  secondary: 'border border-line bg-surface-strong text-ink hover:bg-surface',
  ghost: 'text-muted hover:bg-surface hover:text-ink',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3.5 text-sm gap-1.5',
  md: 'min-h-11 px-5 text-[15px] gap-2',
  lg: 'min-h-13 px-6 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold transition duration-150 select-none active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
