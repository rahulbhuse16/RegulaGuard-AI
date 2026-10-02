import { api } from './client'
import type { ComplianceGap, ControlAssessment, ControlMapping, EvidenceAssessment, Remediation, RiskAssessment } from '@/types/api'

// --- Control Mappings (Feature 5) ---
export async function generateControlMappings(obligationId: string, candidateControlIds?: string[]) {
  const res = await api.post('/control-mappings/generate', { obligation_id: obligationId, candidate_control_ids: candidateControlIds })
  return res.data as { execution_id: string; mappings_created?: number }
}

export async function listControlMappings(obligationId?: string): Promise<ControlMapping[]> {
  const res = await api.get<ControlMapping[]>('/control-mappings', { params: obligationId ? { obligation_id: obligationId } : {} })
  return res.data
}

export async function approveControlMapping(id: string, notes?: string) {
  const res = await api.post(`/control-mappings/${id}/approve`, { notes })
  return res.data as { id: string; review_status: string }
}

export async function rejectControlMapping(id: string, notes?: string) {
  const res = await api.post(`/control-mappings/${id}/reject`, { notes })
  return res.data as { id: string; review_status: string }
}

// --- Control Assessments (Feature 6) ---
export async function generateControlAssessment(controlId: string) {
  const res = await api.post('/control-assessments/generate', { control_id: controlId })
  return res.data as { execution_id: string; assessment_id?: string; effectiveness?: string }
}

export async function listControlAssessments(controlId?: string): Promise<ControlAssessment[]> {
  const res = await api.get<ControlAssessment[]>('/control-assessments', { params: controlId ? { control_id: controlId } : {} })
  return res.data
}

// --- Evidence Assessments (Feature 7) ---
export async function assessEvidence(evidenceId: string, obligationText: string, controlName: string) {
  const res = await api.post('/evidence/assess', {
    evidence_id: evidenceId,
    obligation_text: obligationText,
    control_name: controlName,
  })
  return res.data as { execution_id: string; assessment_id?: string; sufficiency?: string }
}

export async function listEvidenceAssessments(evidenceId?: string): Promise<EvidenceAssessment[]> {
  const res = await api.get<EvidenceAssessment[]>('/evidence-assessments', { params: evidenceId ? { evidence_id: evidenceId } : {} })
  return res.data
}

// --- Gaps (Feature 8) ---
export async function analyzeGaps(obligationId: string) {
  const res = await api.post('/gaps/analyze', { obligation_id: obligationId })
  return res.data as { execution_id: string; gaps_created?: number }
}

export async function listGaps(params: { is_open?: boolean; category?: string } = {}): Promise<ComplianceGap[]> {
  const res = await api.get<ComplianceGap[]>('/gaps', { params })
  return res.data
}

// --- Risk Assessments (Feature 9) ---
export async function calculateGapRisk(gapId: string, overrides?: Record<string, number>) {
  const res = await api.post('/risk-assessments/calculate', { gap_id: gapId, overrides })
  return res.data as { execution_id: string; risk_assessment_id?: string; score?: number; priority?: string }
}

export async function listRiskAssessments(gapId?: string): Promise<RiskAssessment[]> {
  const res = await api.get<RiskAssessment[]>('/risk-assessments', { params: gapId ? { gap_id: gapId } : {} })
  return res.data
}

// --- Remediations (Feature 10) ---
export async function generateRemediation(gapId: string) {
  const res = await api.post('/remediations/generate', { gap_id: gapId })
  return res.data as { execution_id: string; remediation_id?: string }
}

export async function listRemediations(gapId?: string): Promise<Remediation[]> {
  const res = await api.get<Remediation[]>('/remediations', { params: gapId ? { gap_id: gapId } : {} })
  return res.data
}

export async function approveRemediation(id: string, notes?: string) {
  const res = await api.post(`/remediations/${id}/approve`, { notes })
  return res.data as { id: string; provenance: string }
}

export async function rejectRemediation(id: string, notes?: string) {
  const res = await api.post(`/remediations/${id}/reject`, { notes })
  return res.data as { id: string; provenance: string }
}
