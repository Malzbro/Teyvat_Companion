import { Card, ElementBadge } from '../components'
import { FEATURED_CHARACTER } from '../config'
import { getCharacter, iconUrl } from '../data'
import { PageHeader } from './PageHeader'

/** Placeholder until Step 12. Shows the featured character so the look can be judged. */
export function HomeScreen() {
  const yelan = getCharacter(FEATURED_CHARACTER)!
  return (
    <>
      <PageHeader title="Teyvat Companion" subtitle="Welcome back" />
      <Card element={yelan.element} flush>
        <div className="relative h-56 overflow-hidden">
          <img
            src={iconUrl(yelan.icons.splash)}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover object-[60%_25%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-solid via-surface-solid/30 to-transparent" />
        </div>
        <div className="relative -mt-14 space-y-2 p-4">
          <ElementBadge element={yelan.element} />
          <h2 className="font-display text-2xl font-semibold">{yelan.name}</h2>
          <p className="text-sm text-muted">Your goals and today's farming will show up here.</p>
        </div>
      </Card>
    </>
  )
}
