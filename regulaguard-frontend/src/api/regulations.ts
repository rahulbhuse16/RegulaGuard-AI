import { api } from './client'
import type { Page, Jurisdiction, Regulation, RegulationVersion, Regulator } from '@/types/api'

export async function listRegulators(page = 1, pageSize = 50): Promise<Page<Regulator>> {
  const res = await api.get<Page<Regulator>>('/regulators', { params: { page, page_size: pageSize } })
  return res.data
}

export async function createRegulator(payload: { name: string; short_code?: string; description?: string }): Promise<Regulator> {
  const res = await api.post<Regulator>('/regulators', payload)
  return res.data
}

export async function listJurisdictions(page = 1, pageSize = 50): Promise<Page<Jurisdiction>> {
  const res = await api.get<Page<Jurisdiction>>('/jurisdictions', { params: { page, page_size: pageSize } })
  return res.data
}

export async function createJurisdiction(payload: { name: string; country_code?: string }): Promise<Jurisdiction> {
  const res = await api.post<Jurisdiction>('/jurisdictions', payload)
  return res.data
}

export async function listRegulations(params: {
  page?: number
  page_size?: number
  regulator_id?: string
  jurisdiction_id?: string
} = {}): Promise<Page<Regulation>> {
  const res = await api.get<Page<Regulation>>('/regulations', { params })
  return res.data
}

export async function getRegulation(id: string): Promise<Regulation> {
  const res = await api.get<Regulation>(`/regulations/${id}`)
  return res.data
}

export async function createRegulation(payload: {
  regulator_id: string
  jurisdiction_id: string
  title: string
  code?: string
  summary?: string
}): Promise<Regulation> {
  const res = await api.post<Regulation>('/regulations', payload)
  return res.data
}

export async function listRegulationVersions(regulationId?: string): Promise<Page<RegulationVersion>> {
  const res = await api.get<Page<RegulationVersion>>('/regulation-versions', {
    params: regulationId ? { regulation_id: regulationId } : {},
  })
  return res.data
}

export async function createRegulationVersion(payload: {
  regulation_id: string
  version_label: string
  publication_date?: string
  effective_date?: string
  is_current?: boolean
}): Promise<RegulationVersion> {
  const res = await api.post<RegulationVersion>('/regulation-versions', payload)
  return res.data
}
