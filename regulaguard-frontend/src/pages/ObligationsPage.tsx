import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { approveObligation, extractObligations, listObligations, modifyObligation, rejectObligation } from '@/api/obligations'
import { listRegulationVersions } from '@/api/regulations'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { Pagination } from '@/components/ui/Pagination'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { ReviewActions } from '@/components/ui/ReviewActions'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { AiNotice, InlineError } from '@/components/ui/Notices'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, humanize } from '@/utils/format'
import type { ReviewStatus } from '@/types/enums'

export default function ObligationsPage() {
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const canReview = hasRole('COMPLIANCE_ANALYST', 'COMPLIANCE_MANAGER', 'ADMIN')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ReviewStatus | ''>('')
  const [version, setVersion] = useState('')

  const versions = useQuery({ queryKey: ['regulation-versions'], queryFn: () => listRegulationVersions() })
  const obligations = useQuery({
    queryKey: ['obligations', page, status, version],
    queryFn: () => listObligations({ page, page_size: 20, review_status: status || undefined, regulation_version_id: version || undefined }),
  })

  const refresh = () => { void qc.invalidateQueries({ queryKey: ['obligations'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }) }

  const extract = useMutation({ mutationFn: () => extractObligations(version), onSuccess: refresh })
  const decide = useMutation({
    mutationFn: async (v: { id: string; decision: 'approve' | 'reject' | 'modify'; notes: string; text?: string }) => {
      if (v.decision === 'approve') return approveObligation(v.id, v.notes)
      if (v.decision === 'reject') return rejectObligation(v.id, v.notes)
      return modifyObligation(v.id, v.text ?? '', v.notes)
    },
    onSuccess: refresh,
  })

  return (
    <div>
      <PageHeader
        title="Obligations"
        description="Requirements the extraction agent found in regulatory text. Each starts as pending and only counts once a person approves it."
        actions={canReview && (
          <Button size="sm" disabled={!version} isLoading={extract.isPending} onClick={() => extract.mutate()} title={version ? undefined : 'Choose a regulation version first'}>
            <Sparkles className="size-4" /> Extract from selected version
          </Button>
        )}
      />
      <div className="mb-4 space-y-3">
        <AiNotice>Extracted obligations are AI interpretations of the source text. Review each against the cited passage before approving.</AiNotice>
        <InlineError error={extract.error ?? decide.error} />
        {extract.isSuccess && <p className="text-sm text-teal-700">Extraction finished. {extract.data.obligations_created ?? 0} new obligations are waiting for review.</p>}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <Select aria-label="Regulation version" value={version} onChange={(e) => { setVersion(e.target.value); setPage(1) }}>
          <option value="">All versions</option>
          {versions.data?.items.map((v) => <option key={v.id} value={v.id}>Version {v.version_label} ({v.id.slice(0, 6)})</option>)}
        </Select>
        <Select aria-label="Review status" value={status} onChange={(e) => { setStatus(e.target.value as ReviewStatus | ''); setPage(1) }}>
          <option value="">Any review status</option>
          {(['PENDING', 'APPROVED', 'MODIFIED', 'REJECTED'] as ReviewStatus[]).map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
      </div>

      <QueryBoundary query={obligations} isEmpty={(d) => d.items.length === 0} emptyTitle="No obligations found" emptyDescription="Upload a regulation linked to a version, then extract obligations from it.">
        {(d) => (
          <>
            <DataTable
              rows={d.items}
              columns={[
                { key: 'text', header: 'Obligation', render: (o) => (<div className="max-w-xl"><p>{o.obligation_text}</p><p className="mt-1 text-xs text-slate-500">{o.requirement_type ? humanize(o.requirement_type) : 'Type not given'}{o.responsible_function ? `, owned by ${o.responsible_function}` : ''}</p></div>) },
                { key: 'eff', header: 'Effective', render: (o) => formatDate(o.effective_date) },
                { key: 'conf', header: 'AI confidence', render: (o) => <ConfidenceIndicator confidence={o.confidence} /> },
                { key: 'status', header: 'Review', render: (o) => <StatusBadge status={o.review_status} /> },
                { key: 'act', header: '', render: (o) => canReview && (
                  <ReviewActions
                    allowModify
                    modifyInitialText={o.obligation_text}
                    pending={decide.isPending}
                    disabled={o.review_status === 'APPROVED'}
                    onDecide={(decision, notes, text) => decide.mutate({ id: o.id, decision, notes, text })}
                  />
                ) },
              ]}
            />
            <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPageChange={setPage} />
          </>
        )}
      </QueryBoundary>
      <p className="mt-4 text-xs text-slate-400">Source passages are stored with each obligation by the backend. A citations endpoint is not exposed yet, so passages cannot be shown here.</p>
    </div>
  )
}
