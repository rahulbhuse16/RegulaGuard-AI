// These mirror app/models/enums.py in the backend byte-for-byte.
// Do not invent values here — if the backend adds one, add it here to match.

export type Role = 'COMPLIANCE_ANALYST' | 'COMPLIANCE_MANAGER' | 'AUDITOR' | 'ADMIN'

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED'

export type DocumentStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'EXTRACTING'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'INDEXED'
  | 'READY'
  | 'FAILED'

export type DocumentType = 'REGULATION' | 'INTERNAL_POLICY' | 'CONTROL_DOC' | 'EVIDENCE' | 'OTHER'

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED'

export type MappingStatus = 'FULL' | 'PARTIAL' | 'NONE' | 'CONFLICT'

export type ControlEffectiveness = 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE' | 'NOT_TESTED'

export type EvidenceSufficiency = 'SUFFICIENT' | 'MISSING' | 'EXPIRED' | 'CONTRADICTORY' | 'WEAK' | 'INSUFFICIENT_EVIDENCE'

export type GapCategory =
  | 'OBLIGATION_UNMAPPED'
  | 'CONTROL_MISSING'
  | 'CONTROL_PARTIAL'
  | 'CONTROL_INEFFECTIVE'
  | 'EVIDENCE_MISSING'
  | 'EVIDENCE_EXPIRED'
  | 'EVIDENCE_CONFLICT'
  | 'REGULATORY_CONFLICT'
  | 'PROCESS_DEFICIENCY'

export type RiskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type RemediationProvenance = 'AI_GENERATED' | 'HUMAN_MODIFIED' | 'HUMAN_APPROVED' | 'HUMAN_REJECTED'

export type RemediationTaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE'

export type AgentExecutionStatus = 'QUEUED' | 'RUNNING' | 'WAITING_REVIEW' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export type AgentName =
  | 'REGULATORY_INTELLIGENCE'
  | 'OBLIGATION_EXTRACTION'
  | 'APPLICABILITY'
  | 'CONTROL_MAPPING'
  | 'CONTROL_ASSESSMENT'
  | 'EVIDENCE_ASSESSMENT'
  | 'GAP_ANALYSIS'
  | 'RISK_ASSESSMENT'
  | 'REMEDIATION'
  | 'IMPACT_ANALYSIS'
  | 'CROSS_REGULATION'
  | 'CONTRADICTION_DETECTION'
  | 'MONITORING'

export type ContradictionType = 'DIRECT' | 'CONDITIONAL' | 'TIMING' | 'JURISDICTIONAL' | 'PRODUCT_SPECIFIC'

export type ContradictionReviewStatus = 'POTENTIAL' | 'CONFIRMED' | 'REJECTED'

export type MonitoringJobStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
