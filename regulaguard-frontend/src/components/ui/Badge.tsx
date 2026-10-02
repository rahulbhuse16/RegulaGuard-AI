import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'neutral' | 'brass' | 'teal' | 'crimson' | 'amber' | 'ochre' | 'moss'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brass: 'bg-brass-100 text-brass-700',
  teal: 'bg-teal-100 text-teal-700',
  crimson: 'bg-crimson-100 text-crimson-700',
  amber: 'bg-amber-100 text-amber-700',
  ochre: 'bg-ochre-100 text-ochre-600',
  moss: 'bg-moss-100 text-moss-600',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium', toneClasses[tone], className)}>
      {children}
    </span>
  )
}
