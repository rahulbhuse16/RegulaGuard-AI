import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listGaps, listRiskAssessments } from '@/api/compliancePipeline'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { SourceCitation } from '@/components/ui/SourceCitation'
import { Section, ShortId } from '@/components/ui/Field'
import { StatCard } from '@/components/ui/StatCard'
import { Select } from '@/components/ui/Select'
import { humanize } from '@/utils/format'
import { GAP_CATEGORIES, RISK_ORDER } from '@/utils/constants'
import type { RiskPriority } from '@/types/enums'
import { cn } from '@/utils/cn'

const CELL: Record<RiskPriority, string> = {
  CRITICAL: 'bg-crimson-100 text-crimson-700', HIGH: 'bg-amber-100 text-amber-700', MEDIUM: 'bg-ochre-100 text-ochre-600', LOW: 'bg-moss-100 text-moss-600',
}

export default function RiskPage() {
  const [priority, setPriority] = useState<RiskPriority | ''>('')
  const risks = useQuery({ queryKey: ['risk-assessments'], queryFn: () => listRiskAssessments() })
  const gaps = useQuery({ queryKey: ['gaps', 'all'], queryFn: () => listGaps({}) })
  const gapOf = (id: string) => gaps.data?.find((g) => g.id === id)

  return (
    <div>
      <PageHeader title="Risk prioritization" description="Scores come from the backend's fixed, versioned scoring formula. This page only displays them and never recalculates or adjusts a score." />
      <QueryBoundary query={risks} isEmpty={(d) => d.length === 0} emptyTitle="No gaps have been scored yet" emptyDescription="Open the Gaps page and score a gap to see it prioritized here.">
        {(all) => {
          const rows = all.filter((r) => !priority || r.priority === priority).sort((a, b) => b.score - a.score)
          const count = (p: RiskPriority) => all.filter((r) => r.priority === p).length
          return (
            <>
              <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Critical" value={count('CRITICAL')} accent="crimson" />
                <StatCard label="High" value={count('HIGH')} accent="amber" />
                <StatCard label="Medium" value={count('MEDIUM')} accent="brass" />
                <StatCard label="Low" value={count('LOW')} accent="teal" />
              </div>

              <Section title="Priority by gap category">
                <div className="overflow-x-auto rounded-[var(--radius-card)] border border-ink-100 bg-white">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-ink-100 text-left text-slate-500"><th className="px-4 py-2 font-medium">Gap category</th>{RISK_ORDER.map((p) => <th key={p} className="px-4 py-2 text-center font-medium">{humanize(p)}</th>)}</tr></thead>
                    <tbody>
                      {GAP_CATEGORIES.map((cat) => {
                        const inCat = all.filter((r) => gapOf(r.gap_id)?.category === cat)
                        if (inCat.length === 0) return null
                        return (
                          <tr key={cat} className="border-b border-ink-100 last:border-0">
                            <td className="px-4 py-2">{humanize(cat)}</td>
                            {RISK_ORDER.map((p) => { const n = inCat.filter((r) => r.priority === p).length; return <td key={p} className="px-2 py-1.5 text-center"><span className={cn('tabular inline-block min-w-8 rounded px-2 py-1', n ? CELL[p] : 'text-ink-300')}>{n}</span></td> })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-400">The API returns a score and priority per gap, not separate likelihood and impact values, so a likelihood-by-impact matrix cannot be drawn without inventing data.</p>
              </Section>

              <Section title="Scored gaps" aside={<Select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value as RiskPriority | '')}><option value="">All priorities</option>{RISK_ORDER.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</Select>}>
                <DataTable
                  rows={rows}
                  columns={[
                    { key: 'gap', header: 'Gap', render: (r) => (<div className="max-w-md"><p>{gapOf(r.gap_id)?.description ?? <ShortId id={r.gap_id} />}</p>{gapOf(r.gap_id) && <p className="text-xs text-slate-500">{humanize(gapOf(r.gap_id)!.category)}</p>}</div>) },
                    { key: 'risk', header: 'Priority', render: (r) => <RiskBadge priority={r.priority} score={r.score} /> },
                    { key: 'model', header: 'Model', render: (r) => <span className="text-xs text-slate-500">{r.model_version}</span> },
                    { key: 'why', header: 'How it was scored', render: (r) => <div className="max-w-md"><SourceCitation reasoning={r.rationale} /></div> },
                  ]}
                />
              </Section>
            </>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
