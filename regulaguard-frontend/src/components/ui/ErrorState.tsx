import { AlertTriangle, WifiOff } from 'lucide-react'
import { ApiError } from '@/api/client'
import { Button } from './Button'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isApiError = error instanceof ApiError
  const isNetwork = isApiError && error.isNetworkError
  const message = isApiError ? error.message : 'Something went wrong loading this data.'
  const requestId = isApiError ? error.requestId : null

  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-crimson-100 bg-crimson-100/30 px-6 py-10 text-center">
      <div className="text-crimson-700">{isNetwork ? <WifiOff className="size-6" /> : <AlertTriangle className="size-6" />}</div>
      <p className="text-sm font-medium text-crimson-700">{isNetwork ? 'Could not reach the server' : 'Request failed'}</p>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {requestId && <p className="text-xs text-slate-400">Request ID: {requestId}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
