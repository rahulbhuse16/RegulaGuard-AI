import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-ink-100 px-6 py-12 text-center">
      <div className="text-slate-400">{icon ?? <Inbox className="size-6" />}</div>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
