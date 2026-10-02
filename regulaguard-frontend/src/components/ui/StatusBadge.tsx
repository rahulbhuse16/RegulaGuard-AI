import { Badge } from './Badge'

/**
 * Renders any of the backend's lifecycle/review-status strings with a
 * consistent tone mapping. Covers ReviewStatus, ContradictionReviewStatus,
 * RemediationProvenance, DocumentStatus, MappingStatus, ControlEffectiveness,
 * EvidenceSufficiency, AgentExecutionStatus and MonitoringJobStatus — one
 * component, one lookup table, so the same word always reads the same way.
 */
const STATUS_TONE: Record<string, 'neutral' | 'brass' | 'teal' | 'crimson' | 'amber' | 'ochre' | 'moss'> = {
  PENDING: 'brass',
  APPROVED: 'teal',
  HUMAN_APPROVED: 'teal',
  REJECTED: 'crimson',
  HUMAN_REJECTED: 'crimson',
  MODIFIED: 'ochre',
  HUMAN_MODIFIED: 'ochre',
  AI_GENERATED: 'brass',

  POTENTIAL: 'brass',
  CONFIRMED: 'crimson',

  UPLOADED: 'neutral',
  VALIDATING: 'neutral',
  EXTRACTING: 'brass',
  CHUNKING: 'brass',
  EMBEDDING: 'brass',
  INDEXED: 'ochre',
  READY: 'teal',
  FAILED: 'crimson',

  FULL: 'teal',
  PARTIAL: 'ochre',
  NONE: 'neutral',
  CONFLICT: 'crimson',

  EFFECTIVE: 'teal',
  PARTIALLY_EFFECTIVE: 'ochre',
  INEFFECTIVE: 'crimson',
  NOT_TESTED: 'neutral',

  SUFFICIENT: 'teal',
  MISSING: 'crimson',
  EXPIRED: 'amber',
  CONTRADICTORY: 'crimson',
  WEAK: 'ochre',
  INSUFFICIENT_EVIDENCE: 'neutral',

  QUEUED: 'neutral',
  RUNNING: 'brass',
  WAITING_REVIEW: 'ochre',
  COMPLETED: 'teal',
  CANCELLED: 'neutral',

  SCHEDULED: 'neutral',

  OPEN: 'amber',
  CLOSED: 'teal',
}

const LABEL_OVERRIDES: Record<string, string> = {
  WAITING_REVIEW: 'Awaiting review',
  HUMAN_APPROVED: 'Approved',
  HUMAN_REJECTED: 'Rejected',
  HUMAN_MODIFIED: 'Modified',
  AI_GENERATED: 'AI generated, needs review',
  PARTIALLY_EFFECTIVE: 'Partially effective',
  NOT_TESTED: 'Not tested',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'neutral'
  const label = LABEL_OVERRIDES[status] ?? toTitleCase(status)
  return <Badge tone={tone}>{label}</Badge>
}
