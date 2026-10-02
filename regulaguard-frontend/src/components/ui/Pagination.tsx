import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-3 text-sm text-slate-500">
      <span>
        {total} result{total === 1 ? '' : 's'}, page {page} of {totalPages}
      </span>
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-3.5" /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
