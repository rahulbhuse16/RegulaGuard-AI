import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createSimulation } from '@/api/analysis'
import { listJurisdictions, listRegulations } from '@/api/regulations'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DataTable } from '@/components/ui/DataTable'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Section } from '@/components/ui/Field'
import { InlineError, SimulationBanner } from '@/components/ui/Notices'
import { humanize } from '@/utils/format'

export default function SimulationPage() {
  const [regulation, setRegulation] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [productId, setProductId] = useState('')
  const [businessUnitId, setBusinessUnitId] = useState('')
  const [effective, setEffective] = useState('')
  const [assumptions, setAssumptions] = useState('')
  const regulations = useQuery({ queryKey: ['regulations', 'all'], queryFn: () => listRegulations({ page_size: 100 }) })
  const jurisdictions = useQuery({ queryKey: ['jurisdictions'], queryFn: () => listJurisdictions() })
  const run = useMutation({
    mutationFn: () => createSimulation({
      regulation_id: regulation || undefined, jurisdiction_id: jurisdiction || undefined,
      product_id: productId || undefined, business_unit_id: businessUnitId || undefined,
      hypothetical_effective_date: effective || undefined, assumptions: assumptions || undefined,
    }),
  })
  const r = run.data

  return (
    <div>
      <PageHeader title="What-if simulation" description="Explore what would happen if a regulation applied to a product, business unit or jurisdiction. Nothing you run here changes real compliance records." />
      <div className="mb-6 grid gap-3 rounded-[var(--radius-card)] border border-ink-100 bg-white p-4 md:grid-cols-2">
        <Select label="Regulation" value={regulation} onChange={(e) => setRegulation(e.target.value)}><option value="">Choose regulation</option>{regulations.data?.items.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select>
        <Select label="Jurisdiction" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}><option value="">Not specified</option>{jurisdictions.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        <Input label="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} hint="Optional. The backend does not list products yet." />
        <Input label="Business unit ID" value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} hint="Optional. The backend does not list business units yet." />
        <Input label="Hypothetical effective date" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} />
        <Input label="Assumptions" value={assumptions} onChange={(e) => setAssumptions(e.target.value)} />
        <div><Button isLoading={run.isPending} disabled={!regulation} onClick={() => run.mutate()}>Run simulation</Button></div>
      </div>
      <InlineError error={run.error} />

      {r && (
        <div className="space-y-6">
          <SimulationBanner />
          <Section title={`Scenario result${r.regulation ? ` for ${r.regulation}` : ''}`}>
            <p className="mb-3 text-sm text-slate-600">{r.note}</p>
            {r.assumptions && <p className="mb-3 text-sm text-slate-600">Assumptions used: {r.assumptions}</p>}
          </Section>
          <Section title="Controls that would be affected">
            {r.affected_controls.length === 0 ? <p className="text-sm text-slate-500">No existing controls matched the product or business unit scope.</p> : (
              <DataTable rows={r.affected_controls} columns={[{ key: 'n', header: 'Control', render: (c) => c.name }]} />
            )}
          </Section>
          <Section title="Potential gaps">
            <DataTable rows={r.potential_gaps.map((g, i) => ({ ...g, id: String(i) }))} columns={[
              { key: 'c', header: 'Category', render: (g) => humanize(g.category) },
              { key: 'd', header: 'Why', render: (g) => <p className="max-w-xl">{g.description}</p> },
            ]} />
          </Section>
          <Section title="Estimated risk (scenario only)">
            <DataTable rows={r.estimated_risk.map((e, i) => ({ ...e, id: String(i) }))} columns={[
              { key: 'c', header: 'Gap category', render: (e) => humanize(e.gap_category) },
              { key: 'p', header: 'Estimated priority', render: (e) => <RiskBadge priority={e.estimated_priority} score={e.estimated_score} /> },
              { key: 'm', header: 'Model', render: (e) => e.model_version },
            ]} />
          </Section>
          <Section title="What remediation would require"><p className="text-sm text-slate-700">{r.remediation_requirements}</p></Section>
        </div>
      )}
    </div>
  )
}
