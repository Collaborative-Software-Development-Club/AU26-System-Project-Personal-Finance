import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { useFinanceStore } from '@/store/finance-store'
import { ErrorState } from '@/components/feedback/error-state'
import { LoadingSkeleton } from '@/components/feedback/loading-skeleton'
import { UnresolvedOperationsBanner } from '@/components/feedback/unresolved-operations-banner'
import { Header } from './header'
import { PageHeaderProvider } from './page-header-context'
import { Sidebar } from './sidebar'

/**
 * Application frame: persistent sidebar (desktop), header, and the routed page.
 * Loads the finance snapshot once and gates the page on loading / error.
 */
export function AppLayout() {
  const status = useFinanceStore((s) => s.status)
  const error = useFinanceStore((s) => s.error)
  const load = useFinanceStore((s) => s.load)

  useEffect(() => {
    if (status === 'idle') void load()
  }, [status, load])

  // Test backend api call
  useEffect(() => {
  fetch('http://localhost:8000/health')
    .then(async (response) => {
      if (!response.ok) throw new Error(`Health request failed: ${response.status}`)
      const health = await response.json()
      console.log('Backend health:', health)
    })
    .catch((error: unknown) => {
      console.error('Backend health check failed:', error)
    })
}, [])

  return (
    <PageHeaderProvider>
      <div className="min-h-dvh bg-background">
        <Sidebar />
        <div className="flex min-h-dvh flex-col lg:pl-60">
          <Header />
          <main id="main" className="flex-1">
            <UnresolvedOperationsBanner />
            {status === 'error' ? (
              <div className="p-6">
                <ErrorState
                  title="We couldn't load your data"
                  description={error ?? 'Please try again.'}
                  onRetry={() => void load()}
                />
              </div>
            ) : status === 'ready' ? (
              <Outlet />
            ) : (
              <div className="p-6" aria-busy="true" aria-live="polite">
                <LoadingSkeleton variant="page" />
              </div>
            )}
          </main>
        </div>
      </div>
    </PageHeaderProvider>
  )
}
