import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { analyzeGaps, calculateGapRisk, generateRemediation, listGaps, listRiskAssessments } from '@/api/compliancePipeline'
import { listObligations } from '@/api/obligations'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ShortId } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/Notices'
import { useAuth } from '@/hooks/useAuth'
import { humanize } from '@/utils/format'
import { GAP_CATEGORIES } from '@/utils/constants'

export default function GapsPage() {
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const canAct = hasRole('COMPLIANCE_ANALYST', 'COMPLIANCE_MANAGER', 'ADMIN')
  const [openOnly, setOpenOnly] = useState('true')
  const [category, setCategory] = useState('')
  const [obligationId, setObligationId] = useState('')

  const obligations = useQuery({ queryKey: ['obligations', 'approved'], queryFn: () => listObligations({ review_status: 'APPROVED', page_size: 100 }) })
  const gaps = useQuery({ queryKey: ['gaps', openOnly, category], queryFn: () => listGaps({ is_open: openOnly === '' ? undefined : openOnly === 'true', category: category || undefined }) })
  const risks = useQuery({ queryKey: ['risk-assessments'], queryFn: () => listRiskAssessments() })

  const refresh = () => { for (const k of ['gaps', 'risk-assessments', 'remediations', 'dashboard']) void qc.invalidateQueries({ queryKey: [k] }) }
  const analyze = useMutation({ mutationFn: () => analyzeGaps(obligationId), onSuccess: refresh })
  const score = useMutation({ mutationFn: (id: string) => calculateGapRisk(id), onSuccess: refresh })
  const remediate = useMutation({ mutationFn: (id: string) => generateRemediation(id), onSuccess: refresh })
  const riskFor = (gapId: string) => risks.data?.filter((r) => r.gap_id === gapId).sort((a, b) => b.score - a.score)[0]
  const obligationText = (id?: string | null) => (id ? obligations.data?.items.find((o) => o.id === id)?.obligation_text : undefined)

  return (
    <div>
      <PageHeader title="Gaps" description="Where an obligation is not fully covered, tested or evidenced. Gaps come from rules applied to reviewed mappings, assessments and evidence." />
      <div className="mb-4"><InlineError error={analyze.error ?? score.error ?? remediate.error} /></div>
      {analyze.isSuccess && <p className="mb-3 text-sm text-teal-700">Gap analysis finished and found {analyze.data.gaps_created ?? 0} gaps.</p>}

      {canAct && (
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-xl">
            <Select label="Find gaps for an approved obligation" value={obligationId} onChange={(e) => setObligationId(e.target.value)}>
              <option value="">Choose an obligation</option>
              {obligations.data?.items.map((o) => <option key={o.id} value={o.id}>{o.obligation_text.slice(0, 90)}</option>)}
            </Select>
          </div>
          <Button disabled={!obligationId} isLoading={analyze.isPending} onClick={() => analyze.mutate()}>Run gap analysis</Button>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <Select aria-label="Gap state" value={openOnly} onChange={(e) => setOpenOnly(e.target.value)}>
          <option value="true">Open gaps</option><option value="false">Closed gaps</option><option value="">All gaps</option>
        </Select>
        <Select aria-label="Gap category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>{GAP_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
        </Select>
      </div>

      <QueryBoundary query={gaps} isEmpty={(d) => d.length === 0} emptyTitle="No gaps found" emptyDescription="Run gap analysis on an approved obligation, or change the filters.">
        {(rows) => (
          <DataTable
            rows={rows}
            columns={[
              { key: 'cat', header: 'Category', render: (g) => <span className="font-medium">{humanize(g.category)}</span> },
              { key: 'desc', header: 'Description', render: (g) => (<div className="max-w-md"><p>{g.description}</p><p className="mt-1 text-xs text-slate-500">Obligation: {obligationText(g.obligation_id)?.slice(0, 80) ?? <ShortId id={g.obligation_id} />}</p></div>) },
              { key: 'ctl', header: 'Control', render: (g) => <ShortId id={g.control_id} /> },
              { key: 'risk', header: 'Risk', render: (g) => { const r = riskFor(g.id); return r ? <RiskBadge priority={r.priority} score={r.score} /> : <span className="text-xs text-slate-400">Not scored</span> } },
              { key: 'state', header: 'State', render: (g) => <StatusBadge status={g.is_open ? 'OPEN' : 'CLOSED'} /> },
              { key: 'act', header: '', render: (g) => canAct && (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" isLoading={score.isPending && score.variables === g.id} onClick={() => score.mutate(g.id)}>Score risk</Button>
                  <Button size="sm" variant="ghost" isLoading={remediate.isPending && remediate.variables === g.id} onClick={() => remediate.mutate(g.id)}>Draft remediation</Button>
                </div>
              ) },
            ]}
          />
        )}
      </QueryBoundary>
    </div>
  )
}
