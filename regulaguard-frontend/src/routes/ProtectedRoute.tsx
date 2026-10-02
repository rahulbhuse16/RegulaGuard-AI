import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Role } from '@/types/enums'

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth()
  if (isLoading) return <div className="p-10"><LoadingSkeleton rows={3} /></div>
  if (!isAuthenticated) return <Navigate to="/walkthrough" replace />
  // UI-level guard only; the backend remains the authority on authorization.
  if (roles && !hasRole(...roles)) {
    return (
      <div className="p-10">
        <EmptyState title="You do not have access to this page" description="Your role does not include this area. Ask an administrator if you need it." />
      </div>
    )
  }
  return <Outlet />
}
