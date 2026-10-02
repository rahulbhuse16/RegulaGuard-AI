import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { compareRegulations, listCrossRegulationFindings } from '@/api/analysis'
import { listRegulations } from '@/api/regulations'
import { listObligations } from '@/api/obligations'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { SourceCitation } from '@/components/ui/SourceCitation'
import { Badge } from '@/components/ui/Badge'
import { ShortId } from '@/components/ui/Field'
import { AiNotice, InlineError } from '@/components/ui/Notices'
import { humanize } from '@/utils/format'

export default function CrossRegulationPage() {
  const qc = useQueryClient()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const regulations = useQuery({ queryKey: ['regulations', 'all'], queryFn: () => listRegulations({ page_size: 100 }) })
  const obligations = useQuery({ queryKey: ['obligations', 'approved'], queryFn: () => listObligations({ review_status: 'APPROVED', page_size: 100 }) })
  const findings = useQuery({ queryKey: ['cross-findings', a, b], queryFn: () => listCrossRegulationFindings(a || undefined, b || undefined) })
  const compare = useMutation({ mutationFn: () => compareRegulations(a, b), onSuccess: () => void qc.invalidateQueries({ queryKey: ['cross-findings'] }) })
  const text = (id?: string | null) => (id ? obligations.data?.items.find((o) => o.id === id)?.obligation_text : undefined)

  return (
    <div>
      <PageHeader title="Cross-regulation intelligence" description="Compare two regulations to find shared, similar, overlapping, duplicate or conflicting requirements. Only approved obligations are compared." />
      <div className="mb-4 space-y-3">
        <AiNotice>Similar wording does not mean identical duties. Treat every finding as a lead for review, and check both source passages.</AiNotice>
        <InlineError error={compare.error} />
        {compare.isSuccess && <p className="text-sm text-teal-700">Comparison finished with {compare.data.findings_created ?? 0} findings.</p>}
      </div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-72"><Select label="Regulation A" value={a} onChange={(e) => setA(e.target.value)}><option value="">Choose</option>{regulations.data?.items.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</Select></div>
        <div className="w-72"><Select label="Regulation B" value={b} onChange={(e) => setB(e.target.value)}><option value="">Choose</option>{regulations.data?.items.filter((r) => r.id !== a).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</Select></div>
        <Button disabled={!a || !b} isLoading={compare.isPending} onClick={() => compare.mutate()}>Compare regulations</Button>
      </div>
      <QueryBoundary query={findings} isEmpty={(d) => d.length === 0} emptyTitle="No findings yet" emptyDescription="Pick two regulations with approved obligations and run a comparison.">
        {(rows) => (
          <DataTable rows={rows} columns={[
            { key: 't', header: 'Relationship', render: (f) => <Badge tone={f.finding_type === 'CONFLICT' ? 'crimson' : 'brass'}>{humanize(f.finding_type)}</Badge> },
            { key: 'ab', header: 'Requirements compared', render: (f) => (
              <div className="max-w-xl space-y-1 text-sm">
                <p><span className="text-slate-500">A: </span>{text(f.obligation_a_id) ?? <ShortId id={f.obligation_a_id} />}</p>
                <p><span className="text-slate-500">B: </span>{text(f.obligation_b_id) ?? <ShortId id={f.obligation_b_id} />}</p>
              </div>
            ) },
            { key: 'c', header: 'AI confidence', render: (f) => <ConfidenceIndicator confidence={f.confidence} /> },
            { key: 'w', header: 'Reasoning', render: (f) => <SourceCitation reasoning={f.explanation} confidence={f.confidence} /> },
          ]} />
        )}
      </QueryBoundary>
    </div>
  )
}
