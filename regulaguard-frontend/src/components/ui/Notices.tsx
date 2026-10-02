import { FlaskConical, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

/** Marks content as AI-generated interpretation, not an authoritative regulatory conclusion. */
export function AiNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-brass-100 bg-brass-100/40 px-3 py-2 text-sm text-brass-700">
      <Sparkles className="mt-0.5 size-4 shrink-0" />
      <span>{children ?? 'AI-generated interpretation. It needs human review and is not legal or regulatory advice.'}</span>
    </div>
  )
}

/** Required on every simulation result so hypothetical output is never mistaken for actual compliance status. */
export function SimulationBanner() {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-ochre-600 bg-ochre-100 px-3 py-2 text-sm text-ochre-600">
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <span>
        <strong>Simulation.</strong> This is scenario-based analysis. No actual compliance status, gap, or risk record was created or changed.
      </span>
    </div>
  )
}

export function InlineError({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : 'The request failed.'
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-crimson-100 bg-crimson-100/40 px-3 py-2 text-sm text-crimson-700">
      {message}
    </div>
  )
}
