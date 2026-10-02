import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listMonitoringJobs, triggerMonitoring } from '@/api/observability'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { InlineError } from '@/components/ui/Notices'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/utils/format'

export default function MonitoringPage() {
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const canTrigger = hasRole('COMPLIANCE_MANAGER', 'ADMIN')
  const jobs = useQuery({ queryKey: ['monitoring-jobs'], queryFn: listMonitoringJobs, enabled: hasRole('COMPLIANCE_MANAGER', 'ADMIN', 'AUDITOR') })
  const trigger = useMutation({ mutationFn: () => triggerMonitoring(), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['monitoring-jobs'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }) } })

  return (
    <div>
      <PageHeader title="Monitoring" description="Checks for new regulatory documents and versions. Run a check on demand to see the cycle end to end." actions={canTrigger && <Button isLoading={trigger.isPending} onClick={() => trigger.mutate()}>Run monitoring check now</Button>} />
      <div className="mb-4 space-y-3">
        <InlineError error={trigger.error} />
        {trigger.data && <p className="text-sm text-slate-600">{trigger.data.result_summary}</p>}
        <p className="text-sm text-slate-500">No external regulatory sources are connected yet, so a check completes without finding new documents. New documents you upload are picked up through Documents.</p>
      </div>
      <QueryBoundary query={jobs} isEmpty={(d) => d.length === 0} emptyTitle="No monitoring checks yet" emptyDescription={canTrigger ? 'Run a check to record the first job.' : 'A compliance manager can run a check.'}>
        {(rows) => (
          <DataTable rows={rows} columns={[
            { key: 'src', header: 'Source', render: (j) => j.source_name },
            { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
            { key: 'how', header: 'Started by', render: (j) => (j.triggered_manually ? 'Manual trigger' : 'Schedule') },
            { key: 'start', header: 'Started', render: (j) => formatDateTime(j.started_at) },
            { key: 'docs', header: 'New documents', align: 'right', render: (j) => <span className="tabular">{j.new_documents_found}</span> },
            { key: 'chg', header: 'Changes found', align: 'right', render: (j) => <span className="tabular">{j.changes_detected}</span> },
          ]} />
        )}
      </QueryBoundary>
    </div>
  )
}
