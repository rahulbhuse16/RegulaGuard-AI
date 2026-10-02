import type { ReactNode } from 'react'

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink-950">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function ShortId({ id }: { id?: string | null }) {
  if (!id) return <span className="text-slate-400">none</span>
  return (
    <span className="tabular text-xs text-slate-500" title={id}>
      {id.slice(0, 8)}
    </span>
  )
}
