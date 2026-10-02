import { api } from './client'
import type { DocumentType } from '@/types/enums'
import type { DocumentRecord, Page } from '@/types/api'

export interface UploadDocumentPayload {
  file: File
  document_type: DocumentType
  regulator_id?: string
  jurisdiction_id?: string
  regulation_version_id?: string
}

export async function uploadDocument(payload: UploadDocumentPayload): Promise<DocumentRecord> {
  const form = new FormData()
  form.append('file', payload.file)
  form.append('document_type', payload.document_type)
  if (payload.regulator_id) form.append('regulator_id', payload.regulator_id)
  if (payload.jurisdiction_id) form.append('jurisdiction_id', payload.jurisdiction_id)
  if (payload.regulation_version_id) form.append('regulation_version_id', payload.regulation_version_id)

  const res = await api.post<DocumentRecord>('/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function listDocuments(params: { page?: number; page_size?: number; document_type?: DocumentType } = {}): Promise<
  Page<DocumentRecord>
> {
  const res = await api.get<Page<DocumentRecord>>('/documents', { params })
  return res.data
}

export async function getDocument(id: string): Promise<DocumentRecord> {
  const res = await api.get<DocumentRecord>(`/documents/${id}`)
  return res.data
}
