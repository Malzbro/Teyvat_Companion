import { X } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Sticky footer, e.g. a Save button. */
  footer?: ReactNode
}

/** Bottom sheet for phone-first forms. Closes on backdrop tap or Escape. */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[88dvh] w-full max-w-lg animate-sheet-in flex-col rounded-t-[2rem] border border-b-0 border-line bg-surface-solid shadow-soft"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-surface-strong" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 id={titleId} className="font-display text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-strong hover:text-ink active:scale-90"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer ? (
          <div className="border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : (
          <div className="pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    </div>,
    document.body,
  )
}
