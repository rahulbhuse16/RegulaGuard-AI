import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assessEvidence, listEvidenceAssessments } from '@/api/compliancePipeline'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { SourceCitation } from '@/components/ui/SourceCitation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Section, ShortId } from '@/components/ui/Field'
import { AiNotice, InlineError } from '@/components/ui/Notices'

export default function EvidencePage() {
  const qc = useQueryClient()
  const [evidenceId, setEvidenceId] = useState('')
  const [obligationText, setObligationText] = useState('')
  const [controlName, setControlName] = useState('')
  const assessments = useQuery({ queryKey: ['evidence-assessments'], queryFn: () => listEvidenceAssessments() })
  const assess = useMutation({
    mutationFn: () => assessEvidence(evidenceId.trim(), obligationText, controlName),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['evidence-assessments'] }),
  })
  const ready = /^[0-9a-fA-F-]{36}$/.test(evidenceId.trim()) && obligationText.length > 3 && controlName.length > 1

  return (
    <div>
      <PageHeader title="Evidence" description="Whether the evidence on file supports a control claim. Expiry is checked by date. Sufficiency, weakness and conflict are judged by the AI and cite their reasoning." />
      <div className="mb-4 space-y-3">
        <AiNotice>When the AI cannot reach a confident verdict it reports insufficient evidence instead of guessing.</AiNotice>
        <InlineError error={assess.error} />
      </div>
      <Section title="Assess a piece of evidence">
        <div className="grid gap-3 rounded-[var(--radius-card)] border border-ink-100 bg-white p-4 md:grid-cols-3">
          <Input label="Evidence ID" value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} hint="The backend does not list evidence yet, so paste the ID." />
          <Input label="Obligation it should support" value={obligationText} onChange={(e) => setObligationText(e.target.value)} />
          <Input label="Control name" value={controlName} onChange={(e) => setControlName(e.target.value)} />
          <div><Button disabled={!ready} isLoading={assess.isPending} onClick={() => assess.mutate()}>Assess evidence</Button></div>
        </div>
      </Section>
      <Section title="Evidence assessments">
        <QueryBoundary query={assessments} isEmpty={(d) => d.length === 0} emptyTitle="No evidence assessed yet" emptyDescription="Assess evidence to see whether it is sufficient, weak, expired, missing or contradictory.">
          {(rows) => (
            <DataTable
              rows={rows}
              columns={[
                { key: 'ev', header: 'Evidence', render: (a) => <ShortId id={a.evidence_id} /> },
                { key: 'suff', header: 'Sufficiency', render: (a) => <StatusBadge status={a.sufficiency} /> },
                { key: 'conf', header: 'AI confidence', render: (a) => <ConfidenceIndicator confidence={a.confidence} /> },
                { key: 'why', header: 'Reasoning', render: (a) => <div className="max-w-xl"><SourceCitation reasoning={a.reasoning} confidence={a.confidence} /></div> },
              ]}
            />
          )}
        </QueryBoundary>
      </Section>
    </div>
  )
}
