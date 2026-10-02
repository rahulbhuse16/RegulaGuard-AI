import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAuditEvents } from '@/api/observability'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { QueryBoundary } from '@/components/ui/QueryBoundary'
import { Pagination } from '@/components/ui/Pagination'
import { Input } from '@/components/ui/Input'
import { ShortId } from '@/components/ui/Field'
import { formatDateTime, humanize } from '@/utils/format'

export default function AuditTrailPage() {
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')
  const [entityType, setEntityType] = useState('')
  const events = useQuery({ queryKey: ['audit', page, eventType, entityType], queryFn: () => listAuditEvents({ page, page_size: 50, event_type: eventType || undefined, entity_type: entityType || undefined }) })

  return (
    <div>
      <PageHeader title="Audit trail" description="An append-only record of logins, uploads, agent runs and every human review decision. Entries cannot be edited or deleted from the application." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <Input aria-label="Event type" placeholder="Event type, for example OBLIGATION_APPROVED" value={eventType} onChange={(e) => { setEventType(e.target.value.trim().toUpperCase()); setPage(1) }} />
        <Input aria-label="Entity type" placeholder="Entity type, for example Remediation" value={entityType} onChange={(e) => { setEntityType(e.target.value.trim()); setPage(1) }} />
      </div>
      <QueryBoundary query={events} isEmpty={(d) => d.items.length === 0} emptyTitle="No audit events match" emptyDescription="Try clearing the filters.">
        {(d) => (
          <>
            <DataTable rows={d.items} columns={[
              { key: 'time', header: 'When', render: (e) => <span className="tabular whitespace-nowrap">{formatDateTime(e.created_at)}</span> },
              { key: 'type', header: 'Action', render: (e) => <span className="font-medium">{humanize(e.event_type)}</span> },
              { key: 'entity', header: 'Record', render: (e) => (<span>{e.entity_type ?? 'None'} <ShortId id={e.entity_id} /></span>) },
              { key: 'actor', header: 'User', render: (e) => <ShortId id={e.actor_user_id} /> },
              { key: 'desc', header: 'Detail', render: (e) => e.description ?? '' },
            ]} />
            <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPageChange={setPage} />
          </>
        )}
      </QueryBoundary>
    </div>
  )
}
