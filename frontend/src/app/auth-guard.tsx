import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ErrorState } from '@/components/feedback/error-state'
import { LoadingSkeleton } from '@/components/feedback/loading-skeleton'
import { useAuthStore } from '@/store/auth-store'
import { getPostLoginPath } from './auth-navigation'

function SessionCheck() {
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)
  const restoreSession = useAuthStore((state) => state.restoreSession)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      {status === 'error' ? (
        <ErrorState
          title="We couldn't check your session"
          description={error ?? 'Check your connection and try again.'}
          onRetry={() => void restoreSession().catch(() => {})}
        />
      ) : (
        <div className="w-full max-w-md" role="status" aria-live="polite">
          <p className="mb-4 text-sm text-muted-foreground">Checking your session...</p>
          <LoadingSkeleton variant="form" />
        </div>
      )}
    </main>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const initialized = useAuthStore((state) => state.initialized)
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (!initialized || status === 'error') return <SessionCheck />
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    )
  }
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const initialized = useAuthStore((state) => state.initialized)
  const location = useLocation()

  if (!initialized) return <SessionCheck />
  if (user) return <Navigate to={getPostLoginPath(location.state)} replace />
  return children
}
