import { api } from './client'
import type { AgentExecutionStatus, AgentName } from '@/types/enums'
import type { AgentExecution, AgentStep, AuditEvent, DashboardData, MonitoringJob, Page } from '@/types/api'

// --- Agent Executions ---
export async function listAgentExecutions(params: { agent?: AgentName; status_filter?: AgentExecutionStatus; page?: number; page_size?: number } = {}): Promise<
  Page<AgentExecution>
> {
  const res = await api.get<Page<AgentExecution>>('/agent-executions', { params })
  return res.data
}

export async function getAgentExecution(id: string): Promise<AgentExecution> {
  const res = await api.get<AgentExecution>(`/agent-executions/${id}`)
  return res.data
}

export async function getAgentExecutionSteps(id: string): Promise<AgentStep[]> {
  const res = await api.get<AgentStep[]>(`/agent-executions/${id}/steps`)
  return res.data
}

// --- Dashboard ---
export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<DashboardData>('/dashboard')
  return res.data
}

// --- Audit ---
export async function listAuditEvents(params: { event_type?: string; entity_type?: string; page?: number; page_size?: number } = {}): Promise<
  Page<AuditEvent>
> {
  const res = await api.get<Page<AuditEvent>>('/audit', { params })
  return res.data
}

// --- Monitoring ---
export async function triggerMonitoring(sourceName = 'demo-manual-trigger') {
  const res = await api.post('/monitoring/trigger', { source_name: sourceName })
  return res.data as { job_id: string; status: string; new_documents_found: number; changes_detected: number; result_summary: string }
}

export async function listMonitoringJobs(): Promise<MonitoringJob[]> {
  const res = await api.get<MonitoringJob[]>('/monitoring/jobs')
  return res.data
}
