import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './icons'

interface SheetProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-enter flex max-h-[92svh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="flex flex-none items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[16px] font-bold text-[var(--ink)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--page)] text-[var(--ink-soft)]"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex-none border-t border-[var(--border)] bg-[var(--surface)] p-4">{footer}</div>}
      </div>
    </div>
  )
}
