import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-ink-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-vellum-100/60 text-left text-slate-500">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn('px-4 py-2.5 font-medium', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn('border-b border-ink-100 last:border-0', onRowClick && 'cursor-pointer hover:bg-vellum-100/60')}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-2.5 text-ink-900', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
