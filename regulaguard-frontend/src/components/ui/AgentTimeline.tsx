import { AlertCircle, CheckCircle2, CircleDashed, Wrench } from 'lucide-react'
import type { AgentStep } from '@/types/api'
import { cn } from '@/utils/cn'

export function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  if (steps.length === 0) {
    return <p className="text-sm text-slate-400">No steps recorded for this execution yet.</p>
  }

  return (
    <ol className="relative border-l border-ink-100 pl-5">
      {steps.map((step) => {
        const failed = step.status === 'FAILED' || !!step.error
        const skipped = step.status === 'SKIPPED'
        return (
          <li key={step.id} className="mb-5 last:mb-0">
            <span
              className={cn(
                'absolute -left-[9px] flex size-4 items-center justify-center rounded-full bg-vellum-50',
                failed ? 'text-crimson-700' : skipped ? 'text-slate-400' : 'text-teal-600',
              )}
            >
              {failed ? <AlertCircle className="size-4" /> : skipped ? <CircleDashed className="size-4" /> : <CheckCircle2 className="size-4" />}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink-900">
                {step.step_index}. {step.step_name.replaceAll('_', ' ')}
              </span>
              {step.tool_name && (
                <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-700">
                  <Wrench className="size-3" />
                  {step.tool_name}
                </span>
              )}
            </div>
            {step.reasoning && <p className="mt-1 text-sm text-slate-600">{step.reasoning}</p>}
            {step.error && <p className="mt-1 text-sm text-crimson-700">{step.error}</p>}
          </li>
        )
      })}
    </ol>
  )
}
