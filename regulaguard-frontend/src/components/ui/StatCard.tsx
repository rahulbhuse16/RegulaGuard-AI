import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Accent = 'ink' | 'brass' | 'teal' | 'crimson' | 'amber'

const accentClasses: Record<Accent, string> = {
  ink: 'border-l-ink-700',
  brass: 'border-l-brass-600',
  teal: 'border-l-teal-600',
  crimson: 'border-l-crimson-700',
  amber: 'border-l-amber-700',
}

export function StatCard({
  label,
  value,
  accent = 'ink',
  footnote,
  onClick,
}: {
  label: string
  value: ReactNode
  accent?: Accent
  footnote?: ReactNode
  onClick?: () => void
}) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-r-[var(--radius-card)] border-l-4 bg-white px-4 py-3.5 text-left',
        accentClasses[accent],
        onClick && 'focus-ring transition-shadow hover:shadow-sm',
      )}
    >
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-serif text-3xl font-semibold tabular text-ink-950">{value}</span>
      {footnote && <span className="text-xs text-slate-400">{footnote}</span>}
    </Component>
  )
}
