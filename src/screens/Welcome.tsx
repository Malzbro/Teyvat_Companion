import { useState } from 'react'
import { Button } from '../components'
import { WELCOME_MESSAGE } from '../config'

const KEY = 'welcomed-v1'

const seen = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

/** A one-time welcome with the personal message. */
export function Welcome() {
  const [open, setOpen] = useState(() => !seen())
  if (!open) return null

  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // Fine: it just shows again next time.
    }
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-bg/90 p-6 backdrop-blur-xl"
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        <img
          src="/icon.svg"
          alt=""
          className="mx-auto size-28 rounded-[2rem] shadow-[0_0_60px_-10px_var(--accent)]"
        />
        <div className="space-y-3">
          <h1 id="welcome-title" className="font-display text-3xl font-semibold">
            {WELCOME_MESSAGE.title}
          </h1>
          <p className="leading-relaxed text-muted">{WELCOME_MESSAGE.body}</p>
        </div>
        <ul className="space-y-2 text-left text-sm">
          {[
            ['Home', 'what to farm today and how your goals are going'],
            ['Roster', 'your characters (tap one for their best build)'],
            ['Artifacts', 'add pieces in a few taps'],
            ['Materials', 'set a goal and track what you still need'],
          ].map(([tab, what]) => (
            <li key={tab} className="rounded-2xl border border-line bg-surface px-4 py-2.5">
              <span className="font-bold text-accent">{tab}</span>{' '}
              <span className="text-muted">— {what}</span>
            </li>
          ))}
        </ul>
        <Button block size="lg" onClick={close}>
          Let's go ✿
        </Button>
      </div>
    </div>
  )
}
