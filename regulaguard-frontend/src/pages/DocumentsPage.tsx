import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, UploadCloud } from 'lucide-react'
import { listDocuments, uploadDocument } from '@/api/documents'
import { listJurisdictions, listRegulationVersions, listRegulators } from '@/api/regulations'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { Pagination } from '@/components/ui/Pagination'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Section } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/Notices'
import { cn } from '@/utils/cn'
import { humanize } from '@/utils/format'
import type { DocumentStatus, DocumentType } from '@/types/enums'

const LIFECYCLE: DocumentStatus[] = ['UPLOADED', 'EXTRACTING', 'CHUNKING', 'EMBEDDING', 'READY']

function Lifecycle({ status }: { status: DocumentStatus }) {
  if (status === 'FAILED') return <StatusBadge status="FAILED" />
  const idx = LIFECYCLE.indexOf(status === 'INDEXED' || status === 'VALIDATING' ? (status === 'INDEXED' ? 'EMBEDDING' : 'UPLOADED') : status)
  return (
    <ol className="flex items-center gap-1" aria-label={`Ingestion stage: ${humanize(status)}`}>
      {LIFECYCLE.map((s, i) => (
        <li key={s} title={humanize(s)} className={cn('flex size-4 items-center justify-center rounded-full text-[10px]', i <= idx ? 'bg-teal-600 text-white' : 'bg-ink-100 text-ink-300')}>
          {i <= idx ? <Check className="size-2.5" /> : null}
        </li>
      ))}
    </ol>
  )
}

const TYPES: { value: DocumentType; label: string }[] = [
  { value: 'REGULATION', label: 'Regulation' },
  { value: 'INTERNAL_POLICY', label: 'Internal policy' },
  { value: 'CONTROL_DOC', label: 'Control documentation' },
  { value: 'EVIDENCE', label: 'Evidence' },
  { value: 'OTHER', label: 'Other' },
]

export default function DocumentsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocumentType>('REGULATION')
  const [regulator, setRegulator] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [version, setVersion] = useState('')

  const documents = useQuery({
    queryKey: ['documents', page, typeFilter],
    queryFn: () => listDocuments({ page, page_size: 20, document_type: typeFilter || undefined }),
    // Poll while any document is still moving through the pipeline.
    refetchInterval: (q) => (q.state.data?.items.some((d) => !['READY', 'FAILED'].includes(d.status)) ? 3000 : false),
  })
  const regulators = useQuery({ queryKey: ['regulators'], queryFn: () => listRegulators() })
  const jurisdictions = useQuery({ queryKey: ['jurisdictions'], queryFn: () => listJurisdictions() })
  const versions = useQuery({ queryKey: ['regulation-versions'], queryFn: () => listRegulationVersions() })

  const upload = useMutation({
    mutationFn: () => uploadDocument({ file: file as File, document_type: docType, regulator_id: regulator || undefined, jurisdiction_id: jurisdiction || undefined, regulation_version_id: version || undefined }),
    onSuccess: () => {
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      void qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  return (
    <div>
      <PageHeader title="Documents" description="Upload regulations, internal policies, control documentation and evidence. Each file is validated, chunked and indexed before it can be used by analysis." />

      <Section title="Upload a document">
        <div className="rounded-[var(--radius-card)] border border-ink-100 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select label="Document type" value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Select label="Regulator" value={regulator} onChange={(e) => setRegulator(e.target.value)}>
              <option value="">Not specified</option>{regulators.data?.items.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
            <Select label="Jurisdiction" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
              <option value="">Not specified</option>{jurisdictions.data?.items.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </Select>
            <Select label="Regulation version" value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="">Not linked</option>{versions.data?.items.map((v) => <option key={v.id} value={v.id}>{v.version_label} ({v.id.slice(0, 6)})</option>)}
            </Select>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm file:mr-3 file:rounded file:border file:border-ink-300 file:bg-white file:px-3 file:py-1.5 file:text-sm" aria-label="Choose file" />
            <Button onClick={() => upload.mutate()} disabled={!file} isLoading={upload.isPending}><UploadCloud className="size-4" /> Upload and process</Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">PDF, plain text, Markdown or Word. Maximum 25 MB. Regulation documents should be linked to a version so obligations can be extracted from them.</p>
          <div className="mt-3"><InlineError error={upload.error} /></div>
        </div>
      </Section>

      <Section title="Processed documents" aside={
        <Select aria-label="Filter by type" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as DocumentType | ''); setPage(1) }}>
          <option value="">All types</option>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      }>
        <QueryBoundary query={documents} isEmpty={(d) => d.items.length === 0} emptyTitle="No documents uploaded" emptyDescription="Upload a regulation to begin the compliance workflow.">
          {(d) => (
            <>
              <DataTable
                rows={d.items}
                columns={[
                  { key: 'name', header: 'File', render: (r) => (<div><p className="font-medium">{r.original_filename}</p>{r.failure_reason && <p className="text-xs text-crimson-700">{r.failure_reason}</p>}</div>) },
                  { key: 'type', header: 'Type', render: (r) => humanize(r.document_type) },
                  { key: 'size', header: 'Size', align: 'right', render: (r) => <span className="tabular">{(r.size_bytes / 1024).toFixed(0)} KB</span> },
                  { key: 'life', header: 'Progress', render: (r) => <Lifecycle status={r.status} /> },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
              <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Section>
    </div>
  )
}
