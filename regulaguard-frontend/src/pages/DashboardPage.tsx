import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getDashboard } from '@/api/observability'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { Section } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { humanize } from '@/utils/format'

const RISK_COLORS: Record<string, string> = { CRITICAL: '#7a1f2b', HIGH: '#a15c1b', MEDIUM: '#8a6d1b', LOW: '#3e6e52' }
const EFFECTIVENESS_COLORS: Record<string, string> = {
  EFFECTIVE: '#0e6e63', PARTIALLY_EFFECTIVE: '#8a6d1b', INEFFECTIVE: '#7a1f2b', NOT_TESTED: '#8f9fb3',
}

function toChartData(record: Partial<Record<string, number>> | undefined, order?: string[]) {
  const entries = Object.entries(record ?? {}).map(([name, value]) => ({ name, value: value ?? 0 }))
  if (!order) return entries
  return entries.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
}

function Chart({ data, colors, label }: { data: { name: string; value: number }[]; colors?: Record<string, string>; label: string }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <EmptyState title={`No ${label.toLowerCase()} data yet`} description="This chart fills in as the backend records data." />
  }
  return (
    <div className="h-64 rounded-[var(--radius-card)] border border-ink-100 bg-white p-3" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ ...d, label: humanize(d.name) }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7dde5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5b6b7e' }} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5b6b7e' }} />
          <Tooltip />
          <Bar dataKey="value" name={label}>
            {data.map((d) => <Cell key={d.name} fill={colors?.[d.name] ?? '#24374f'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  return (
    <div>
      <PageHeader title="Compliance dashboard" description="Live totals from the backend. Nothing on this page is estimated in the browser." />
      <QueryBoundary query={query} emptyTitle="No data yet">
        {(d) => {
          const criticalHigh = (d.risk_distribution.CRITICAL ?? 0) + (d.risk_distribution.HIGH ?? 0)
          return (
            <>
              <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Regulations" value={d.regulation_count} onClick={() => navigate('/regulations')} />
                <StatCard label="Obligations" value={d.obligations.total} footnote={`${d.obligations.approved} approved, ${d.obligations.unmapped_or_pending} pending or unapproved`} onClick={() => navigate('/obligations')} accent="brass" />
                <StatCard label="Controls" value={d.control_count} onClick={() => navigate('/controls')} accent="teal" />
                <StatCard label="Evidence items" value={d.evidence_count} onClick={() => navigate('/evidence')} accent="teal" />
                <StatCard label="Open gaps" value={d.gaps.open} footnote={`${d.gaps.total} total`} onClick={() => navigate('/gaps')} accent="amber" />
                <StatCard label="Critical and high risk" value={criticalHigh} onClick={() => navigate('/risk')} accent="crimson" />
                <StatCard label="Regulatory changes" value={d.regulatory_changes} onClick={() => navigate('/regulatory-changes')} />
                <StatCard label="Potential contradictions" value={d.contradictions} onClick={() => navigate('/contradictions')} accent="crimson" />
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <Section title="Risk distribution"><Chart label="Gaps" colors={RISK_COLORS} data={toChartData(d.risk_distribution, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])} /></Section>
                <Section title="Control effectiveness"><Chart label="Controls assessed" colors={EFFECTIVENESS_COLORS} data={toChartData(d.control_effectiveness, ['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_TESTED'])} /></Section>
                <Section title="Gaps by category"><Chart label="Gaps" data={toChartData(d.gaps.by_category)} /></Section>
                <Section title="Remediation tasks by status"><Chart label="Tasks" data={toChartData(d.remediation.tasks_by_status)} /></Section>
              </div>

              <Section title="Monitoring jobs by status">
                <Chart label="Jobs" data={toChartData(d.monitoring_status)} />
              </Section>
            </>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
