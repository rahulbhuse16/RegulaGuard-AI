import type { RiskPriority } from '@/types/enums'
import { Badge } from './Badge'

const RISK_CONFIG: Record<RiskPriority, { label: string; tone: 'crimson' | 'amber' | 'ochre' | 'moss' }> = {
  CRITICAL: { label: 'Critical', tone: 'crimson' },
  HIGH: { label: 'High', tone: 'amber' },
  MEDIUM: { label: 'Medium', tone: 'ochre' },
  LOW: { label: 'Low', tone: 'moss' },
}

/** Displays a risk priority exactly as returned by the backend's deterministic risk_model — never computed client-side. */
export function RiskBadge({ priority, score }: { priority: RiskPriority; score?: number | null }) {
  const config = RISK_CONFIG[priority]
  return (
    <Badge tone={config.tone}>
      {config.label}
      {typeof score === 'number' && <span className="tabular opacity-70">{score.toFixed(1)}</span>}
    </Badge>
  )
}
