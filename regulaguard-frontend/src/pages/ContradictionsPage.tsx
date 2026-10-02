import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { confirmContradiction, detectContradiction, listContradictions, rejectContradiction } from '@/api/analysis'
import { listObligations } from '@/api/obligations'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { SourceCitation } from '@/components/ui/SourceCitation'
import { ReviewActions } from '@/components/ui/ReviewActions'
import { Badge } from '@/components/ui/Badge'
import { ShortId } from '@/components/ui/Field'
import { AiNotice, InlineError } from '@/components/ui/Notices'
import { useAuth } from '@/hooks/useAuth'
import { humanize } from '@/utils/format'

export default function ContradictionsPage() {
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const canReview = hasRole('COMPLIANCE_ANALYST', 'COMPLIANCE_MANAGER', 'ADMIN')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const obligations = useQuery({ queryKey: ['obligations', 'approved'], queryFn: () => listObligations({ review_status: 'APPROVED', page_size: 100 }) })
  const contradictions = useQuery({ queryKey: ['contradictions'], queryFn: () => listContradictions() })
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['contradictions'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }) }
  const detect = useMutation({ mutationFn: () => detectContradiction(a, b), onSuccess: refresh })
  const decide = useMutation({ mutationFn: (v: { id: string; decision: string; notes: string }) => (v.decision === 'approve' ? confirmContradiction(v.id, v.notes) : rejectContradiction(v.id, v.notes)), onSuccess: refresh })
  const text = (id: string) => obligations.data?.items.find((o) => o.id === id)?.obligation_text

  return (
    <div>
      <PageHeader title="Contradictions" description="Requirements that may conflict with each other. Every finding is a potential contradiction until a reviewer confirms it." />
      <div className="mb-4 space-y-3">
        <AiNotice>A potential contradiction is not a legal conclusion. Confirming one records your review, and rejecting one dismisses the flag.</AiNotice>
        <InlineError error={detect.error ?? decide.error} />
        {detect.isSuccess && <p className="text-sm text-teal-700">{detect.data.contradiction_found ? 'A potential contradiction was found and is waiting for review.' : 'No contradiction was found between these two obligations.'}</p>}
      </div>
      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <Select label="Requirement A" value={a} onChange={(e) => setA(e.target.value)}><option value="">Choose approved obligation</option>{obligations.data?.items.map((o) => <option key={o.id} value={o.id}>{o.obligation_text.slice(0, 80)}</option>)}</Select>
        <Select label="Requirement B" value={b} onChange={(e) => setB(e.target.value)}><option value="">Choose approved obligation</option>{obligations.data?.items.filter((o) => o.id !== a).map((o) => <option key={o.id} value={o.id}>{o.obligation_text.slice(0, 80)}</option>)}</Select>
        <Button disabled={!a || !b} isLoading={detect.isPending} onClick={() => detect.mutate()}>Check for contradiction</Button>
      </div>
      <QueryBoundary query={contradictions} isEmpty={(d) => d.length === 0} emptyTitle="No contradictions recorded" emptyDescription="Choose two approved obligations from different regulations to check them.">
        {(rows) => (
          <div className="space-y-4">
            {rows.map((c) => (
              <article key={c.id} className="rounded-r-[var(--radius-card)] border-l-4 border-l-crimson-700 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="crimson">{humanize(c.contradiction_type)}</Badge>
                  <StatusBadge status={c.review_status} />
                  <ConfidenceIndicator confidence={c.confidence} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border border-ink-100 p-3"><p className="mb-1 text-xs text-slate-500">Requirement A</p><p className="text-sm">{text(c.obligation_a_id) ?? <ShortId id={c.obligation_a_id} />}</p></div>
                  <div className="rounded border border-ink-100 p-3"><p className="mb-1 text-xs text-slate-500">Requirement B</p><p className="text-sm">{text(c.obligation_b_id) ?? <ShortId id={c.obligation_b_id} />}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <SourceCitation reasoning={`${c.explanation}${c.conditions ? ` Conditions: ${c.conditions}` : ''}`} confidence={c.confidence} />
                  {canReview && <ReviewActions approveLabel="Confirm" rejectLabel="Dismiss" pending={decide.isPending} disabled={c.review_status !== 'POTENTIAL'} onDecide={(decision, notes) => decide.mutate({ id: c.id, decision, notes })} />}
                </div>
              </article>
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
