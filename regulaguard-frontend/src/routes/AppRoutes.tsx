import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import NotAvailablePage from '@/pages/NotAvailablePage'
import { useAuth } from '@/hooks/useAuth'

const AppLandingPage = lazy(() => import('@/pages/AppLandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const RegulationsPage = lazy(() => import('@/pages/RegulationsPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const ObligationsPage = lazy(() => import('@/pages/ObligationsPage'))
const ControlMappingPage = lazy(() => import('@/pages/ControlMappingPage'))
const ControlAssessmentsPage = lazy(() => import('@/pages/ControlAssessmentsPage'))
const EvidencePage = lazy(() => import('@/pages/EvidencePage'))
const GapsPage = lazy(() => import('@/pages/GapsPage'))
const RiskPage = lazy(() => import('@/pages/RiskPage'))
const RemediationPage = lazy(() => import('@/pages/RemediationPage'))
const MonitoringPage = lazy(() => import('@/pages/MonitoringPage'))
const ImpactAnalysisPage = lazy(() => import('@/pages/ImpactAnalysisPage'))
const SimulationPage = lazy(() => import('@/pages/SimulationPage'))
const CrossRegulationPage = lazy(() => import('@/pages/CrossRegulationPage'))
const ContradictionsPage = lazy(() => import('@/pages/ContradictionsPage'))
const AgentActivityPage = lazy(() => import('@/pages/AgentActivityPage'))
const AuditTrailPage = lazy(() => import('@/pages/AuditTrailPage'))

/**
 * "/" is the public landing page for a signed-out visitor. A signed-in user
 * who lands on "/" (e.g. a bookmark) is sent straight to the dashboard
 * instead of seeing marketing copy again.
 */
function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="p-10"><LoadingSkeleton rows={3} /></div>
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <AppLandingPage />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-10"><LoadingSkeleton rows={3} /></div>}>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="regulations" element={<RegulationsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="obligations" element={<ObligationsPage />} />
            <Route path="regulatory-changes" element={<NotAvailablePage title="Regulatory changes" missing="The backend records regulatory changes and can analyze their impact, but it has no endpoint to list them or compare two versions side by side. Use Impact analysis with a change ID in the meantime." />} />
            <Route path="controls" element={<NotAvailablePage title="Policies and controls" missing="The backend stores policies and controls, but it has no endpoint to list or create them yet. Upload control documents on the Documents page." />} />
            <Route path="control-mapping" element={<ControlMappingPage />} />
            <Route path="control-assessments" element={<ControlAssessmentsPage />} />
            <Route path="evidence" element={<EvidencePage />} />
            <Route path="gaps" element={<GapsPage />} />
            <Route path="risk" element={<RiskPage />} />
            <Route path="remediation" element={<RemediationPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="impact-analysis" element={<ImpactAnalysisPage />} />
            <Route path="simulation" element={<SimulationPage />} />
            <Route path="cross-regulation" element={<CrossRegulationPage />} />
            <Route path="contradictions" element={<ContradictionsPage />} />
            <Route path="agents" element={<AgentActivityPage />} />
            <Route element={<ProtectedRoute roles={['AUDITOR', 'COMPLIANCE_MANAGER', 'ADMIN']} />}>
              <Route path="audit" element={<AuditTrailPage />} />
            </Route>
            <Route path="*" element={<NotAvailablePage title="Page not found" missing="This address does not match a page in the app." />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}