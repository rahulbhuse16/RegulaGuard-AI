import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateControlAssessment, listControlAssessments } from '@/api/compliancePipeline'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { SourceCitation } from '@/components/ui/SourceCitation'
import { IdActionForm } from '@/components/ui/IdActionForm'
import { ShortId } from '@/components/ui/Field'
import { AiNotice, InlineError } from '@/components/ui/Notices'

export default function ControlAssessmentsPage() {
  const qc = useQueryClient()
  const assessments = useQuery({ queryKey: ['control-assessments'], queryFn: () => listControlAssessments() })
  const generate = useMutation({ mutationFn: (id: string) => generateControlAssessment(id), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['control-assessments'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }) } })

  return (
    <div>
      <PageHeader title="Control assessments" description="Effectiveness is decided from test history and recency by rules. The AI only explains the rating and flags evidence that disagrees with it." />
      <div className="mb-4 space-y-3">
        <AiNotice>The rating comes from the latest control test. A test older than 12 months is shown as not tested.</AiNotice>
        <InlineError error={generate.error} />
        {generate.isSuccess && <p className="text-sm text-teal-700">Assessment recorded: {generate.data.effectiveness?.replaceAll('_', ' ').toLowerCase()}.</p>}
      </div>
      <div className="mb-6">
        <IdActionForm label="Control ID" buttonLabel="Assess control" pending={generate.isPending} onSubmit={(id) => generate.mutate(id)} hint="The backend does not list controls yet, so paste the control ID." />
      </div>
      <QueryBoundary query={assessments} isEmpty={(d) => d.length === 0} emptyTitle="No control assessments yet" emptyDescription="Assess a control to see its effectiveness rating and supporting reasoning.">
        {(rows) => (
          <DataTable
            rows={rows}
            columns={[
              { key: 'control', header: 'Control', render: (a) => <ShortId id={a.control_id} /> },
              { key: 'eff', header: 'Effectiveness', render: (a) => <StatusBadge status={a.effectiveness} /> },
              { key: 'conf', header: 'AI confidence', render: (a) => <ConfidenceIndicator confidence={a.confidence} /> },
              { key: 'why', header: 'Reasoning and evidence', render: (a) => <div className="max-w-xl"><SourceCitation reasoning={a.reasoning} confidence={a.confidence} /></div> },
            ]}
          />
        )}
      </QueryBoundary>
    </div>
  )
}
