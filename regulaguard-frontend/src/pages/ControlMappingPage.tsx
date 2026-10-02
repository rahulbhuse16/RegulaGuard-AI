import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Sparkles } from 'lucide-react'
import { approveControlMapping, generateControlMappings, listControlMappings, rejectControlMapping } from '@/api/compliancePipeline'
import { listObligations } from '@/api/obligations'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { SourceCitation } from '@/components/ui/SourceCitation'
import { ReviewActions } from '@/components/ui/ReviewActions'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ShortId } from '@/components/ui/Field'
import { AiNotice, InlineError } from '@/components/ui/Notices'
import { useAuth } from '@/hooks/useAuth'

export default function ControlMappingPage() {
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const canReview = hasRole('COMPLIANCE_ANALYST', 'COMPLIANCE_MANAGER', 'ADMIN')
  const [obligationId, setObligationId] = useState('')

  const obligations = useQuery({ queryKey: ['obligations', 'approved'], queryFn: () => listObligations({ review_status: 'APPROVED', page_size: 100 }) })
  const mappings = useQuery({ queryKey: ['control-mappings', obligationId], queryFn: () => listControlMappings(obligationId || undefined) })

  const refresh = () => void qc.invalidateQueries({ queryKey: ['control-mappings'] })
  const generate = useMutation({ mutationFn: () => generateControlMappings(obligationId), onSuccess: refresh })
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: string; notes: string }) => (v.decision === 'approve' ? approveControlMapping(v.id, v.notes) : rejectControlMapping(v.id, v.notes)),
    onSuccess: refresh,
  })
  const obligationText = (id: string) => obligations.data?.items.find((o) => o.id === id)?.obligation_text

  return (
    <div>
      <PageHeader title="Control mapping" description="How each approved obligation is covered by internal controls. Suggestions from the mapping agent stay pending until a reviewer decides." />
      <div className="mb-4 space-y-3">
        <AiNotice>Suggested mappings are AI interpretations. Full, partial and conflict verdicts each carry a rationale you can open and check.</AiNotice>
        <InlineError error={generate.error ?? decide.error} />
        {generate.isSuccess && <p className="text-sm text-teal-700">Mapping run finished with {generate.data.mappings_created ?? 0} suggested mappings.</p>}
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xl">
          <Select label="Approved obligation" value={obligationId} onChange={(e) => setObligationId(e.target.value)}>
            <option value="">Show all mappings</option>
            {obligations.data?.items.map((o) => <option key={o.id} value={o.id}>{o.obligation_text.slice(0, 90)}</option>)}
          </Select>
        </div>
        {canReview && <Button disabled={!obligationId} isLoading={generate.isPending} onClick={() => generate.mutate()}><Sparkles className="size-4" /> Suggest control mappings</Button>}
      </div>

      <QueryBoundary query={mappings} isEmpty={(d) => d.length === 0} emptyTitle="No mappings yet" emptyDescription="Pick an approved obligation and ask the agent to suggest control mappings. Controls must exist first.">
        {(rows) => (
          <DataTable
            rows={rows}
            columns={[
              { key: 'chain', header: 'Obligation to control', render: (m) => (
                <div className="flex max-w-lg items-start gap-2">
                  <p className="text-sm">{obligationText(m.obligation_id) ?? <ShortId id={m.obligation_id} />}</p>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <span className="shrink-0 text-sm">Control <ShortId id={m.control_id} /></span>
                </div>
              ) },
              { key: 'status', header: 'Coverage', render: (m) => <StatusBadge status={m.status} /> },
              { key: 'conf', header: 'AI confidence', render: (m) => <ConfidenceIndicator confidence={m.confidence} /> },
              { key: 'why', header: 'Reasoning', render: (m) => <SourceCitation reasoning={m.rationale} confidence={m.confidence} /> },
              { key: 'review', header: 'Review', render: (m) => <StatusBadge status={m.review_status} /> },
              { key: 'act', header: '', render: (m) => canReview && (
                <ReviewActions pending={decide.isPending} disabled={m.review_status !== 'PENDING'} onDecide={(decision, notes) => decide.mutate({ id: m.id, decision, notes })} />
              ) },
            ]}
          />
        )}
      </QueryBoundary>
    </div>
  )
}
