import { api } from './client'
import type { ContradictionReviewStatus } from '@/types/enums'
import type { Contradiction, CrossRegulationFinding, ImpactAnalysisResult, SimulationResult } from '@/types/api'

// --- Impact Analysis (Feature 11) ---
export async function runImpactAnalysis(regulatoryChangeId: string): Promise<ImpactAnalysisResult> {
  const res = await api.post<ImpactAnalysisResult>('/impact-analysis', { regulatory_change_id: regulatoryChangeId })
  return res.data
}

// --- Simulation (Feature 12) ---
export interface SimulationPayload {
  regulation_id?: string
  product_id?: string
  jurisdiction_id?: string
  business_unit_id?: string
  hypothetical_effective_date?: string
  assumptions?: string
}

export async function createSimulation(payload: SimulationPayload): Promise<SimulationResult> {
  const res = await api.post<SimulationResult>('/simulations', payload)
  return res.data
}

export async function listSimulations(): Promise<{ id: string; result: SimulationResult; created_at: string }[]> {
  const res = await api.get('/simulations')
  return res.data
}

// --- Cross-Regulation (Feature 13) ---
export async function compareRegulations(regulationAId: string, regulationBId: string) {
  const res = await api.post('/cross-regulation/compare', { regulation_a_id: regulationAId, regulation_b_id: regulationBId })
  return res.data as { execution_id: string; findings_created?: number }
}

export async function listCrossRegulationFindings(regulationAId?: string, regulationBId?: string): Promise<CrossRegulationFinding[]> {
  const res = await api.get<CrossRegulationFinding[]>('/cross-regulation/findings', {
    params: { regulation_a_id: regulationAId, regulation_b_id: regulationBId },
  })
  return res.data
}

// --- Contradictions (Feature 14) ---
export async function detectContradiction(obligationAId: string, obligationBId: string) {
  const res = await api.post('/contradictions/detect', { obligation_a_id: obligationAId, obligation_b_id: obligationBId })
  return res.data as { execution_id: string; contradiction_found: boolean; contradiction_id?: string }
}

export async function listContradictions(reviewStatus?: ContradictionReviewStatus): Promise<Contradiction[]> {
  const res = await api.get<Contradiction[]>('/contradictions', { params: reviewStatus ? { review_status: reviewStatus } : {} })
  return res.data
}

export async function confirmContradiction(id: string, notes?: string) {
  const res = await api.post(`/contradictions/${id}/confirm`, { notes })
  return res.data as { id: string; review_status: string }
}

export async function rejectContradiction(id: string, notes?: string) {
  const res = await api.post(`/contradictions/${id}/reject`, { notes })
  return res.data as { id: string; review_status: string }
}
