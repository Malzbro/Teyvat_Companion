import { X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '../components'

const KEY = 'howto-dismissed-v1'

const STEPS: [string, string, string][] = [
  ['Bring in your characters', 'Roster → Import pulls them from your in-game showcase.', '/roster'],
  ['Add your artifacts', 'Artifacts → Add. Your last set is remembered.', '/artifacts'],
  ['Open a character', 'See their stats and the best builds from your artifacts.', '/roster'],
  [
    'Set a goal',
    'Materials shows exactly what to farm, and Home shows today’s domains.',
    '/materials',
  ],
]

/** A short "how to use" card on Home that she can dismiss. */
export function HowToCard() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  if (hidden) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // It will just show again.
    }
    setHidden(true)
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">How to use</h2>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide how to use"
          className="grid size-9 place-items-center rounded-full text-faint hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>
      <ol className="space-y-2">
        {STEPS.map(([title, text, to], i) => (
          <li key={title}>
            <Link to={to} className="flex gap-3 rounded-2xl p-1 transition hover:bg-surface-strong">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                {i + 1}
              </span>
              <span className="text-sm">
                <span className="font-bold">{title}</span>
                <span className="block text-muted">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}
