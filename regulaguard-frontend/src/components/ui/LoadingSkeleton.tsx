export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-[var(--radius-card)] bg-ink-100/60" />
      ))}
    </div>
  )
}
