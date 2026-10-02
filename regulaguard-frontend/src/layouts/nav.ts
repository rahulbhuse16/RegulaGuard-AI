import {
  Activity, BookOpen, ClipboardCheck, FileStack, FlaskConical, Gauge, GitCompare, History, LayoutDashboard,
  Link2, ListChecks, Radar, ShieldAlert, ShieldCheck, Swords, Wrench, type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types/enums'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  roles?: Role[]
}
export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }] },
  {
    title: 'Regulatory intelligence',
    items: [
      { label: 'Regulations', to: '/regulations', icon: BookOpen },
      { label: 'Documents', to: '/documents', icon: FileStack },
      { label: 'Regulatory changes', to: '/regulatory-changes', icon: GitCompare },
      { label: 'Obligations', to: '/obligations', icon: ListChecks },
    ],
  },
  {
    title: 'Controls',
    items: [
      { label: 'Policies and controls', to: '/controls', icon: ShieldCheck },
      { label: 'Control mapping', to: '/control-mapping', icon: Link2 },
      { label: 'Control assessments', to: '/control-assessments', icon: ClipboardCheck },
      { label: 'Evidence', to: '/evidence', icon: FileStack },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { label: 'Gaps', to: '/gaps', icon: ShieldAlert },
      { label: 'Risk prioritization', to: '/risk', icon: Gauge },
      { label: 'Remediation', to: '/remediation', icon: Wrench },
      { label: 'Monitoring', to: '/monitoring', icon: Radar },
    ],
  },
  {
    title: 'AI analysis',
    items: [
      { label: 'Impact analysis', to: '/impact-analysis', icon: Activity },
      { label: 'What-if simulation', to: '/simulation', icon: FlaskConical },
      { label: 'Cross-regulation', to: '/cross-regulation', icon: GitCompare },
      { label: 'Contradictions', to: '/contradictions', icon: Swords },
      { label: 'Agent activity', to: '/agents', icon: Activity },
    ],
  },
  {
    title: 'Governance',
    items: [{ label: 'Audit trail', to: '/audit', icon: History, roles: ['AUDITOR', 'COMPLIANCE_MANAGER', 'ADMIN'] }],
  },
]
