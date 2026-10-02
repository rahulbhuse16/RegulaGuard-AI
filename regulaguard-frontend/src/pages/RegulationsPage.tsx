import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createJurisdiction, createRegulation, createRegulationVersion, createRegulator, listJurisdictions, listRegulationVersions, listRegulations, listRegulators } from '@/api/regulations'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Section } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/Notices'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/format'

type Dialog = null | 'regulator' | 'jurisdiction' | 'regulation' | 'version'

export default function RegulationsPage() {
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const canWrite = hasRole('COMPLIANCE_MANAGER', 'ADMIN')
  const [page, setPage] = useState(1)
  const [regulatorFilter, setRegulatorFilter] = useState('')
  const [jurisdictionFilter, setJurisdictionFilter] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const regulators = useQuery({ queryKey: ['regulators'], queryFn: () => listRegulators() })
  const jurisdictions = useQuery({ queryKey: ['jurisdictions'], queryFn: () => listJurisdictions() })
  const regulations = useQuery({
    queryKey: ['regulations', page, regulatorFilter, jurisdictionFilter],
    queryFn: () => listRegulations({ page, page_size: 20, regulator_id: regulatorFilter || undefined, jurisdiction_id: jurisdictionFilter || undefined }),
  })
  const versions = useQuery({ queryKey: ['regulation-versions'], queryFn: () => listRegulationVersions() })

  const regulatorName = (id: string) => regulators.data?.items.find((r) => r.id === id)?.name ?? id.slice(0, 8)
  const jurisdictionName = (id: string) => jurisdictions.data?.items.find((j) => j.id === id)?.name ?? id.slice(0, 8)

  const save = useMutation({
    mutationFn: async () => {
      if (dialog === 'regulator') return createRegulator({ name: form.name, short_code: form.short_code || undefined })
      if (dialog === 'jurisdiction') return createJurisdiction({ name: form.name, country_code: form.country_code || undefined })
      if (dialog === 'regulation') return createRegulation({ regulator_id: form.regulator_id, jurisdiction_id: form.jurisdiction_id, title: form.title, code: form.code || undefined, summary: form.summary || undefined })
      return createRegulationVersion({ regulation_id: form.regulation_id, version_label: form.version_label, publication_date: form.publication_date || undefined, effective_date: form.effective_date || undefined, is_current: form.is_current === 'true' })
    },
    onSuccess: () => {
      void qc.invalidateQueries()
      setDialog(null)
      setForm({})
    },
  })

  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <PageHeader
        title="Regulations"
        description="Regulatory sources, their regulators and jurisdictions, and every version on file."
        actions={canWrite && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setDialog('regulator')}>Add regulator</Button>
            <Button variant="secondary" size="sm" onClick={() => setDialog('jurisdiction')}>Add jurisdiction</Button>
            <Button variant="secondary" size="sm" onClick={() => setDialog('version')}>Add version</Button>
            <Button size="sm" onClick={() => setDialog('regulation')}>Add regulation</Button>
          </>
        )}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <Select aria-label="Filter by regulator" value={regulatorFilter} onChange={(e) => { setRegulatorFilter(e.target.value); setPage(1) }}>
          <option value="">All regulators</option>
          {regulators.data?.items.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <Select aria-label="Filter by jurisdiction" value={jurisdictionFilter} onChange={(e) => { setJurisdictionFilter(e.target.value); setPage(1) }}>
          <option value="">All jurisdictions</option>
          {jurisdictions.data?.items.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </Select>
      </div>

      <QueryBoundary query={regulations} isEmpty={(d) => d.items.length === 0} emptyTitle="No regulations yet" emptyDescription={canWrite ? 'Add a regulator and jurisdiction, then add your first regulation.' : 'A compliance manager needs to add regulations first.'}>
        {(d) => (
          <>
            <DataTable
              rows={d.items}
              columns={[
                { key: 'title', header: 'Regulation', render: (r) => (<div><p className="font-medium">{r.title}</p>{r.code && <p className="text-xs text-slate-500">{r.code}</p>}</div>) },
                { key: 'regulator', header: 'Regulator', render: (r) => regulatorName(r.regulator_id) },
                { key: 'jurisdiction', header: 'Jurisdiction', render: (r) => jurisdictionName(r.jurisdiction_id) },
                { key: 'demo', header: 'Data', render: (r) => r.is_demo_data ? <Badge tone="brass">Demo data</Badge> : <Badge>Live</Badge> },
              ]}
            />
            <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPageChange={setPage} />
          </>
        )}
      </QueryBoundary>

      <div className="mt-10">
        <Section title="Versions on file">
          <QueryBoundary query={versions} isEmpty={(d) => d.items.length === 0} emptyTitle="No versions recorded" emptyDescription="Add a version to a regulation so obligations can be extracted from it.">
            {(d) => (
              <DataTable
                rows={d.items}
                columns={[
                  { key: 'reg', header: 'Regulation', render: (v) => regulations.data?.items.find((r) => r.id === v.regulation_id)?.title ?? v.regulation_id.slice(0, 8) },
                  { key: 'label', header: 'Version', render: (v) => v.version_label },
                  { key: 'pub', header: 'Published', render: (v) => formatDate(v.publication_date) },
                  { key: 'eff', header: 'Effective', render: (v) => formatDate(v.effective_date) },
                  { key: 'cur', header: 'Status', render: (v) => v.is_current ? <Badge tone="teal">Current</Badge> : <Badge>Superseded</Badge> },
                ]}
              />
            )}
          </QueryBoundary>
        </Section>
      </div>

      <Modal
        open={dialog !== null}
        onClose={() => { setDialog(null); setForm({}) }}
        title={dialog === 'regulator' ? 'Add regulator' : dialog === 'jurisdiction' ? 'Add jurisdiction' : dialog === 'version' ? 'Add regulation version' : 'Add regulation'}
        footer={<><Button variant="secondary" size="sm" onClick={() => setDialog(null)}>Cancel</Button><Button size="sm" isLoading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}
      >
        <div className="space-y-3">
          <InlineError error={save.error} />
          {dialog === 'regulator' && (<><Input label="Name" onChange={set('name')} /><Input label="Short code" onChange={set('short_code')} /></>)}
          {dialog === 'jurisdiction' && (<><Input label="Name" onChange={set('name')} /><Input label="Country code" onChange={set('country_code')} /></>)}
          {dialog === 'regulation' && (
            <>
              <Select label="Regulator" onChange={set('regulator_id')} defaultValue=""><option value="" disabled>Select regulator</option>{regulators.data?.items.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
              <Select label="Jurisdiction" onChange={set('jurisdiction_id')} defaultValue=""><option value="" disabled>Select jurisdiction</option>{jurisdictions.data?.items.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</Select>
              <Input label="Title" onChange={set('title')} /><Input label="Code" onChange={set('code')} /><Input label="Summary" onChange={set('summary')} />
            </>
          )}
          {dialog === 'version' && (
            <>
              <Select label="Regulation" onChange={set('regulation_id')} defaultValue=""><option value="" disabled>Select regulation</option>{regulations.data?.items.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</Select>
              <Input label="Version label" onChange={set('version_label')} />
              <Input label="Publication date" type="date" onChange={set('publication_date')} />
              <Input label="Effective date" type="date" onChange={set('effective_date')} />
              <Select label="Mark as current version" onChange={set('is_current')} defaultValue="false"><option value="false">No</option><option value="true">Yes</option></Select>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
