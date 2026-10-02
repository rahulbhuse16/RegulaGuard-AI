import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingSkeleton } from './LoadingSkeleton'

/** Handles loading / error / empty for any TanStack query so no screen is ever blank. */
export function QueryBoundary<T>({
  query,
  isEmpty,
  emptyTitle,
  emptyDescription,
  children,
}: {
  query: UseQueryResult<T>
  isEmpty?: (data: T) => boolean
  emptyTitle: string
  emptyDescription?: string
  children: (data: T) => ReactNode
}) {
  if (query.isLoading) return <LoadingSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  if (query.data === undefined) return null
  if (isEmpty?.(query.data)) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return <>{children(query.data)}</>
}
