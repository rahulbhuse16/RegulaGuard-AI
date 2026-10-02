import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { runImpactAnalysis } from '@/api/analysis'
import { getAgentExecutionSteps } from '@/api/observability'
import { PageHeader } from '@/components/ui/PageHeader'
import { IdActionForm } from '@/components/ui/IdActionForm'
import { AgentTimeline } from '@/components/ui/AgentTimeline'
import { StatCard } from '@/components/ui/StatCard'
import { Section } from '@/components/ui/Field'
import { AiNotice, InlineError } from '@/components/ui/Notices'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

export default function ImpactAnalysisPage() {
  const run = useMutation({ mutationFn: (id: string) => runImpactAnalysis(id) })
  const executionId = run.data?.execution_id
  const steps = useQuery({ queryKey: ['execution-steps', executionId], queryFn: () => getAgentExecutionSteps(executionId as string), enabled: !!executionId })

  return (
    <div>
      <PageHeader title="Impact analysis" description="Runs the full agent workflow for a regulatory change: obligations, controls, evidence, gaps, risk and remediation." />
      <div className="mb-4 space-y-3">
        <AiNotice>The workflow finishes in a review-required state. Nothing it drafts is approved until a person decides.</AiNotice>
        <InlineError error={run.error} />
      </div>
      <IdActionForm label="Regulatory change ID" buttonLabel="Analyze regulatory impact" pending={run.isPending} onSubmit={(id) => run.mutate(id)} hint="The backend does not list regulatory changes yet, so paste the change ID." />
      {run.isPending && <div className="mt-6"><p className="mb-2 text-sm text-slate-500">The agents are working. This can take a minute.</p><LoadingSkeleton rows={3} /></div>}

      {run.data && (
        <div className="mt-8">
          {run.data.replayed && <p className="mb-3 text-sm text-ochre-600">This change was analyzed before. Showing the earlier run instead of repeating it.</p>}
          {run.data.errors && run.data.errors.length > 0 && (
            <div className="mb-4 rounded-[var(--radius-card)] border border-crimson-100 bg-crimson-100/40 p-3 text-sm text-crimson-700">
              <p className="font-medium">Some steps failed, so the report is partial:</p>
              <ul className="ml-4 list-disc">{run.data.errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Obligations" value={run.data.obligations_affected ?? 0} />
            <StatCard label="Controls evaluated" value={run.data.controls_evaluated ?? 0} accent="teal" />
            <StatCard label="Gaps found" value={run.data.gaps_identified ?? 0} accent="amber" />
            <StatCard label="Risks scored" value={run.data.risk_assessments ?? 0} accent="crimson" />
            <StatCard label="Remediations drafted" value={run.data.remediations_generated ?? 0} accent="brass" />
          </div>
          <Section title="Execution timeline" aside={<Link className="text-sm text-brass-700 hover:text-brass-600" to="/agents">Open in agent activity</Link>}>
            {steps.isLoading ? <LoadingSkeleton rows={3} /> : <AgentTimeline steps={steps.data ?? []} />}
          </Section>
          <p className="text-sm text-slate-500">Next: review the new obligations, mappings, gaps and remediation drafts on their pages.</p>
        </div>
      )}
    </div>
  )
}
