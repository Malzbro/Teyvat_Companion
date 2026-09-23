import { Sparkles, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  message?: string
  icon?: LucideIcon
  action?: ReactNode
}

export function EmptyState({ title, message, icon: Icon = Sparkles, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-mint/25 text-accent">
        <Icon size={28} />
        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-mint shadow-[0_0_12px_var(--mint)]" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {message && <p className="max-w-xs text-sm text-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
