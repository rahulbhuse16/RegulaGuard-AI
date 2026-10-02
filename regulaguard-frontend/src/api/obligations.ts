import { api } from './client'
import type { ReviewStatus } from '@/types/enums'
import type { Obligation, Page } from '@/types/api'

export async function extractObligations(regulationVersionId: string): Promise<{ execution_id: string; obligations_created?: number }> {
  const res = await api.post('/obligations/extract', { regulation_version_id: regulationVersionId })
  return res.data
}

export async function listObligations(params: {
  regulation_version_id?: string
  review_status?: ReviewStatus
  page?: number
  page_size?: number
} = {}): Promise<Page<Obligation>> {
  const res = await api.get<Page<Obligation>>('/obligations', { params })
  return res.data
}

export async function approveObligation(id: string, notes?: string): Promise<Obligation> {
  const res = await api.post<Obligation>(`/obligations/${id}/approve`, { notes })
  return res.data
}

export async function rejectObligation(id: string, notes?: string): Promise<Obligation> {
  const res = await api.post<Obligation>(`/obligations/${id}/reject`, { notes })
  return res.data
}

export async function modifyObligation(id: string, modifiedText: string, notes?: string): Promise<Obligation> {
  const res = await api.post<Obligation>(`/obligations/${id}/modify`, { modified_text: modifiedText, notes })
  return res.data
}
