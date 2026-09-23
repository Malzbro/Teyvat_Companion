import { Boxes, Flower2, House, Users, UsersRound, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { cn } from './components'
import { Welcome } from './screens/Welcome'

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/roster', label: 'Roster', icon: Users },
  { to: '/teams', label: 'Teams', icon: UsersRound },
  { to: '/artifacts', label: 'Artifacts', icon: Flower2 },
  { to: '/materials', label: 'Materials', icon: Boxes },
]

export function AppShell() {
  const location = useLocation()
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main
        key={location.pathname}
        className="flex-1 animate-page-in px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32"
      >
        <Outlet />
      </main>
      <TabBar />
      <Welcome />
    </div>
  )
}

function TabBar() {
  const { pathname } = useLocation()
  // Character pages live under the Roster tab.
  const onCharacter = pathname.startsWith('/character/')
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <ul className="flex items-stretch justify-between rounded-full border border-line bg-surface-solid/85 p-1.5 shadow-soft backdrop-blur-xl">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-bold transition duration-200 active:scale-95',
                  isActive || (onCharacter && to === '/roster')
                    ? 'bg-gradient-to-br from-accent/25 to-mint/15 text-accent'
                    : 'text-faint hover:text-muted',
                )
              }
            >
              <Icon size={21} strokeWidth={2.2} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
