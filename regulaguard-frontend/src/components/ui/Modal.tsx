import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-[var(--radius-card)] bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h2 className="font-serif text-lg font-semibold text-ink-950">{title}</h2>
          <button onClick={onClose} className="focus-ring rounded p-1 text-slate-400 hover:text-ink-900" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
