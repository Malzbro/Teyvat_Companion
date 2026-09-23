import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        {subtitle && (
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">{subtitle}</p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}
