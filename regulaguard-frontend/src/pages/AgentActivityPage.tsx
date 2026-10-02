import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAgentExecutionSteps, listAgentExecutions } from '@/api/observability'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { Pagination } from '@/components/ui/Pagination'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { AgentTimeline } from '@/components/ui/AgentTimeline'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { formatDateTime, humanize } from '@/utils/format'
import type { AgentExecution } from '@/types/api'
import type { AgentExecutionStatus, AgentName } from '@/types/enums'

const AGENTS: AgentName[] = ['OBLIGATION_EXTRACTION', 'CONTROL_MAPPING', 'CONTROL_ASSESSMENT', 'EVIDENCE_ASSESSMENT', 'GAP_ANALYSIS', 'RISK_ASSESSMENT', 'REMEDIATION', 'IMPACT_ANALYSIS', 'CROSS_REGULATION', 'CONTRADICTION_DETECTION', 'MONITORING']
const STATUSES: AgentExecutionStatus[] = ['QUEUED', 'RUNNING', 'WAITING_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED']

function ExecutionDetail({ execution }: { execution: AgentExecution }) {
  const steps = useQuery({ queryKey: ['execution-steps', execution.id], queryFn: () => getAgentExecutionSteps(execution.id) })
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{execution.task}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-slate-500">Started</dt><dd>{formatDateTime(execution.started_at)}</dd></div>
        <div><dt className="text-slate-500">Finished</dt><dd>{formatDateTime(execution.completed_at)}</dd></div>
        <div><dt className="text-slate-500">Retries</dt><dd className="tabular">{execution.retry_count}</dd></div>
        <div><dt className="text-slate-500">Confidence</dt><dd><ConfidenceIndicator confidence={execution.confidence} /></dd></div>
      </dl>
      {execution.errors.length > 0 && <pre className="overflow-x-auto rounded bg-crimson-100/50 p-2 text-xs text-crimson-700">{JSON.stringify(execution.errors, null, 2)}</pre>}
      {execution.final_result && <div><p className="mb-1 text-sm font-medium">Final result</p><pre className="overflow-x-auto rounded bg-vellum-100 p-2 text-xs">{JSON.stringify(execution.final_result, null, 2)}</pre></div>}
      <div><p className="mb-2 text-sm font-medium">Steps and tools used</p>{steps.isLoading ? <LoadingSkeleton rows={2} /> : <AgentTimeline steps={steps.data ?? []} />}</div>
    </div>
  )
}

export default function AgentActivityPage() {
  const [page, setPage] = useState(1)
  const [agent, setAgent] = useState<AgentName | ''>('')
  const [status, setStatus] = useState<AgentExecutionStatus | ''>('')
  const [selected, setSelected] = useState<AgentExecution | null>(null)
  const executions = useQuery({
    queryKey: ['agent-executions', page, agent, status],
    queryFn: () => listAgentExecutions({ page, page_size: 20, agent: agent || undefined, status_filter: status || undefined }),
    refetchInterval: (q) => (q.state.data?.items.some((e) => e.status === 'RUNNING' || e.status === 'QUEUED') ? 3000 : false),
  })

  return (
    <div>
      <PageHeader title="Agent activity" description="Every agent run: what it was asked to do, which tools it used, whether it needed retries, and what it produced." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <Select aria-label="Agent" value={agent} onChange={(e) => { setAgent(e.target.value as AgentName | ''); setPage(1) }}><option value="">All agents</option>{AGENTS.map((a) => <option key={a} value={a}>{humanize(a)}</option>)}</Select>
        <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as AgentExecutionStatus | ''); setPage(1) }}><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
      </div>
      <QueryBoundary query={executions} isEmpty={(d) => d.items.length === 0} emptyTitle="No agent runs yet" emptyDescription="Runs appear here as soon as you extract obligations, map controls or analyze impact.">
        {(d) => (
          <>
            <DataTable rows={d.items} onRowClick={setSelected} columns={[
              { key: 'agent', header: 'Agent', render: (e) => <span className="font-medium">{humanize(e.agent)}</span> },
              { key: 'task', header: 'Task', render: (e) => <p className="max-w-md truncate" title={e.task}>{e.task}</p> },
              { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
              { key: 'step', header: 'Current step', render: (e) => (e.current_step ? humanize(e.current_step) : 'None') },
              { key: 'start', header: 'Started', render: (e) => formatDateTime(e.started_at) },
              { key: 'retry', header: 'Retries', align: 'right', render: (e) => <span className="tabular">{e.retry_count}</span> },
            ]} />
            <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPageChange={setPage} />
          </>
        )}
      </QueryBoundary>
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? humanize(selected.agent) : ''}>
        {selected && <ExecutionDetail execution={selected} />}
      </Modal>
    </div>
  )
}
