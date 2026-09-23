import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '../components'
import { PageHeader } from './PageHeader'

interface PlaceholderScreenProps {
  title: string
  icon: LucideIcon
  message: string
}

/** Stand-in for tabs that later steps build out. */
export function PlaceholderScreen({ title, icon, message }: PlaceholderScreenProps) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={icon} title="Coming soon" message={message} />
    </>
  )
}
