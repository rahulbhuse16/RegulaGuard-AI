export function ConfidenceIndicator({ confidence }: { confidence: number | null | undefined }) {
  if (confidence === null || confidence === undefined) {
    return <span className="text-xs text-slate-400">Confidence not provided</span>
  }
  const pct = Math.round(confidence * 100)
  const tone = pct >= 75 ? 'bg-teal-600' : pct >= 50 ? 'bg-ochre-600' : 'bg-crimson-700'
  return (
    <div className="flex items-center gap-2" title={`Model confidence: ${pct}%`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular text-xs text-slate-600">{pct}%</span>
    </div>
  )
}
