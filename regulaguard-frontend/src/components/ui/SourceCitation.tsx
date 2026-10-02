import { useState } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SourceCitationProps {
  sourceText?: string | null
  reasoning?: string | null
  documentLabel?: string | null
  pageNumber?: number | null
  confidence?: number | null
}

/**
 * Every AI-derived value in this app should be paired with one of these.
 * Collapsed by default so tables stay scannable; expands to show the
 * reasoning, the exact source excerpt, and where it came from — never just
 * an unexplained conclusion.
 */
export function SourceCitation({ sourceText, reasoning, documentLabel, pageNumber, confidence }: SourceCitationProps) {
  const [open, setOpen] = useState(false)
  const hasContent = sourceText || reasoning

  if (!hasContent) {
    return <span className="text-xs text-slate-400">No source reference on file</span>
  }

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring inline-flex items-center gap-1 rounded text-brass-700 hover:text-brass-600"
      >
        <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
        Why / Sources
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-[var(--radius-card)] border border-brass-100 bg-brass-100/30 p-3">
          {reasoning && <p className="text-ink-700">{reasoning}</p>}
          {sourceText && (
            <div className="flex gap-2 border-l-2 border-brass-600 pl-2">
              <FileText className="mt-0.5 size-3.5 shrink-0 text-brass-700" />
              <div>
                <p className="italic text-slate-600">&ldquo;{sourceText}&rdquo;</p>
                {(documentLabel || pageNumber) && (
                  <p className="mt-1 text-slate-400">
                    {documentLabel}
                    {pageNumber ? `, page ${pageNumber}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
          {typeof confidence === 'number' && (
            <p className="text-slate-400">Model confidence: {Math.round(confidence * 100)}%</p>
          )}
        </div>
      )}
    </div>
  )
}
