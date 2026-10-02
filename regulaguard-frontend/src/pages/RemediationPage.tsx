import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveRemediation, listGaps, listRemediations, rejectRemediation } from '@/api/compliancePipeline'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { ReviewActions } from '@/components/ui/ReviewActions'
import { ShortId } from '@/components/ui/Field'
import { AiNotice, InlineError } from '@/components/ui/Notices'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, humanize } from '@/utils/format'

export default function RemediationPage() {
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const canReview = hasRole('COMPLIANCE_MANAGER', 'ADMIN', 'COMPLIANCE_ANALYST')
  const remediations = useQuery({ queryKey: ['remediations'], queryFn: () => listRemediations() })
  const gaps = useQuery({ queryKey: ['gaps', 'all'], queryFn: () => listGaps({}) })
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: string; notes: string }) => (v.decision === 'approve' ? approveRemediation(v.id, v.notes) : rejectRemediation(v.id, v.notes)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['remediations'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
  const gapOf = (id: string) => gaps.data?.find((g) => g.id === id)

  return (
    <div>
      <PageHeader title="Remediation" description="Recommended fixes for open gaps. Each starts as AI generated and needs a person to approve or reject it." />
      <div className="mb-4 space-y-3">
        <AiNotice>Recommendations are drafts. Approving one records your decision and does not change any compliance status by itself.</AiNotice>
        <InlineError error={decide.error} />
      </div>
      <QueryBoundary query={remediations} isEmpty={(d) => d.length === 0} emptyTitle="No remediation drafted yet" emptyDescription="Open the Gaps page and choose Draft remediation on a gap.">
        {(rows) => (
          <DataTable
            rows={rows}
            columns={[
              { key: 'gap', header: 'Gap', render: (r) => (<div className="max-w-xs"><p className="text-sm">{gapOf(r.gap_id)?.description ?? <ShortId id={r.gap_id} />}</p>{gapOf(r.gap_id) && <p className="text-xs text-slate-500">{humanize(gapOf(r.gap_id)!.category)}</p>}</div>) },
              { key: 'rec', header: 'Recommendation', render: (r) => <p className="max-w-md">{r.recommendation}</p> },
              { key: 'owner', header: 'Suggested owner', render: (r) => r.owner ?? 'Not set' },
              { key: 'pri', header: 'Priority', render: (r) => (r.priority ? <RiskBadge priority={r.priority} /> : <span className="text-xs text-slate-400">Not set</span>) },
              { key: 'due', header: 'Target date', render: (r) => formatDate(r.target_date) },
              { key: 'prov', header: 'Status', render: (r) => <StatusBadge status={r.provenance} /> },
              { key: 'act', header: '', render: (r) => canReview && (
                <ReviewActions approveLabel="Approve plan" pending={decide.isPending} disabled={r.provenance !== 'AI_GENERATED'} onDecide={(decision, notes) => decide.mutate({ id: r.id, decision, notes })} />
              ) },
            ]}
          />
        )}
      </QueryBoundary>
    </div>
  )
}
