import type {
  AgentExecutionStatus,
  AgentName,
  ContradictionReviewStatus,
  ContradictionType,
  ControlEffectiveness,
  DocumentStatus,
  DocumentType,
  EvidenceSufficiency,
  GapCategory,
  MappingStatus,
  MonitoringJobStatus,
  RemediationProvenance,
  ReviewStatus,
  RiskPriority,
  Role,
} from './enums'

// ---- Generic envelopes (must match app/schemas/common.py) ----

export interface Page<T> {
  items: T[]
  page: number
  page_size: number
  total: number
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown> | null
    request_id?: string | null
  }
}

// ---- Auth ----

export interface User {
  id: string
  organization_id: string
  email: string
  full_name: string
  role: Role
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// ---- Regulatory reference data ----

export interface Regulator {
  id: string
  name: string
  short_code?: string | null
  description?: string | null
}

export interface Jurisdiction {
  id: string
  name: string
  country_code?: string | null
}

export interface Regulation {
  id: string
  regulator_id: string
  jurisdiction_id: string
  title: string
  code?: string | null
  summary?: string | null
  is_demo_data: boolean
}

export interface RegulationVersion {
  id: string
  regulation_id: string
  version_label: string
  publication_date?: string | null
  effective_date?: string | null
  is_current: boolean
}

// ---- Documents ----

export interface DocumentRecord {
  id: string
  original_filename: string
  mime_type: string
  size_bytes: number
  document_type: DocumentType
  status: DocumentStatus
  failure_reason?: string | null
  regulator_id?: string | null
  jurisdiction_id?: string | null
  regulation_version_id?: string | null
  publication_date?: string | null
  effective_date?: string | null
}

// ---- Obligations ----

export interface Obligation {
  id: string
  regulation_version_id: string
  obligation_text: string
  requirement_type?: string | null
  responsible_function?: string | null
  effective_date?: string | null
  confidence?: number | null
  review_status: ReviewStatus
}

// ---- Control mapping / assessment ----

export interface ControlMapping {
  id: string
  obligation_id: string
  control_id: string
  status: MappingStatus
  confidence?: number | null
  rationale?: string | null
  review_status: ReviewStatus
}

export interface ControlAssessment {
  id: string
  control_id: string
  effectiveness: ControlEffectiveness
  reasoning: string
  confidence?: number | null
}

export interface EvidenceAssessment {
  id: string
  evidence_id: string
  sufficiency: EvidenceSufficiency
  reasoning: string
  confidence?: number | null
}

// ---- Gaps / risk / remediation ----

export interface ComplianceGap {
  id: string
  obligation_id?: string | null
  control_id?: string | null
  category: GapCategory
  description: string
  is_open: boolean
}

export interface RiskAssessment {
  id: string
  gap_id: string
  score: number
  priority: RiskPriority
  rationale: string
  model_version: string
}

export interface Remediation {
  id: string
  gap_id: string
  recommendation: string
  owner?: string | null
  priority?: RiskPriority | null
  target_date?: string | null
  provenance: RemediationProvenance
}

// ---- Analysis: impact / simulation / cross-regulation / contradictions ----

export interface ImpactAnalysisResult {
  execution_id: string
  regulation_version_id?: string
  obligations_affected?: number
  controls_evaluated?: number
  gaps_identified?: number
  risk_assessments?: number
  remediations_generated?: number
  errors?: string[]
  status?: string
  replayed?: boolean
}

export interface SimulationResult {
  simulation_id: string
  result_type: 'SIMULATION'
  regulation: string | null
  affected_controls: { id: string; name: string }[]
  potential_gaps: { category: GapCategory; description: string }[]
  estimated_risk: { gap_category: string; estimated_score: number; estimated_priority: RiskPriority; model_version: string }[]
  remediation_requirements: string
  assumptions?: string | null
  note: string
}

export interface CrossRegulationFinding {
  id: string
  finding_type: string
  explanation: string
  confidence?: number | null
  obligation_a_id?: string | null
  obligation_b_id?: string | null
}

export interface Contradiction {
  id: string
  obligation_a_id: string
  obligation_b_id: string
  contradiction_type: ContradictionType
  explanation: string
  conditions?: string | null
  confidence?: number | null
  review_status: ContradictionReviewStatus
}

// ---- Agent observability ----

export interface AgentExecution {
  id: string
  agent: AgentName
  task: string
  status: AgentExecutionStatus
  started_at?: string | null
  completed_at?: string | null
  current_step?: string | null
  retry_count: number
  confidence?: number | null
  final_result?: Record<string, unknown> | null
  errors: unknown[]
}

export interface AgentStep {
  id: string
  step_index: number
  step_name: string
  tool_name?: string | null
  tool_input?: Record<string, unknown> | null
  tool_output?: Record<string, unknown> | null
  reasoning?: string | null
  status: string
  error?: string | null
}

// ---- Audit ----

export interface AuditEvent {
  id: string
  event_type: string
  entity_type?: string | null
  entity_id?: string | null
  description?: string | null
  actor_user_id?: string | null
  created_at: string
}

// ---- Monitoring ----

export interface MonitoringJob {
  id: string
  source_name: string
  status: MonitoringJobStatus
  triggered_manually: boolean
  started_at?: string | null
  completed_at?: string | null
  new_documents_found: number
  changes_detected: number
  result_summary?: string | null
}

// ---- Dashboard ----

export interface DashboardData {
  regulation_count: number
  obligations: { total: number; approved: number; unmapped_or_pending: number }
  control_count: number
  control_effectiveness: Partial<Record<ControlEffectiveness, number>>
  evidence_count: number
  gaps: { total: number; open: number; by_category: Partial<Record<GapCategory, number>> }
  risk_distribution: Partial<Record<RiskPriority, number>>
  remediation: { total: number; tasks_by_status: Record<string, number> }
  regulatory_changes: number
  contradictions: number
  monitoring_status: Record<string, number>
}
