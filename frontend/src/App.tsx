import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import DashboardPage from '@/pages/DashboardPage'
import MissionsPage from '@/pages/MissionsPage'
import MissionDetailPage from '@/pages/MissionDetailPage'
import MissionPlannerPage from '@/pages/MissionPlannerPage'
import DronesPage from '@/pages/DronesPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SettingsPage from '@/pages/SettingsPage'
import ReportingDashboardPage from '@/pages/ReportingDashboardPage'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useAppStore } from '@/store/appStore'
import { startPerformanceMonitoring } from '@/lib/performanceMonitoring'

function App() {
  const { initialize, isInitialized, isConnected, isLoading } = useAppStore()
  const [initError, setInitError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    // Start performance monitoring
    startPerformanceMonitoring()
    
    // Initialize app (connect to backend, load initial data)
    if (!isInitialized && !retrying) {
      initialize().catch((error) => {
        console.error('Initialization error:', error)
        setInitError(error.message || 'Failed to connect to backend')
      })
    }
  }, [initialize, isInitialized, retrying])

  const handleRetry = async () => {
    setRetrying(true)
    setInitError(null)
    try {
      await initialize()
      setRetrying(false)
    } catch (error: any) {
      setInitError(error.message || 'Failed to connect to backend')
      setRetrying(false)
    }
  }

  // Show loading state
  if (isLoading || retrying) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">
            {retrying ? 'Retrying connection...' : 'Connecting to backend...'}
          </p>
          <p className="text-xs text-muted-foreground">Please wait</p>
        </div>
      </div>
    )
  }

  // Show error state if backend connection failed
  if (initError || (!isInitialized && !isConnected)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-2xl w-full p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Backend Connection Required
              </h1>
              <p className="text-muted-foreground mb-4">
                {initError || 'Unable to connect to the backend server'}
              </p>
            </div>
            <Card className="w-full p-4 bg-secondary/50 text-left">
              <div className="text-sm space-y-2">
                <div className="font-semibold">To start the backend:</div>
                <pre className="text-xs bg-black/50 p-3 rounded overflow-auto">
{`cd backend
.\\venv\\Scripts\\activate
python -m uvicorn main:app --reload`}
                </pre>
                <div className="text-muted-foreground text-xs mt-2">
                  Backend should be running at: <strong>http://localhost:8000</strong>
                </div>
                <div className="text-muted-foreground text-xs mt-2">
                  Check backend console for errors. Make sure port 8000 is not in use.
                </div>
              </div>
            </Card>
            <div className="flex gap-3">
              <Button onClick={handleRetry} variant="default" disabled={retrying}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // App successfully initialized with backend
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="missions/:missionId" element={<MissionDetailPage />} />
          <Route path="missions/plan" element={<MissionPlannerPage />} />
          <Route path="drones" element={<DronesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="reports" element={<ReportingDashboardPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App
