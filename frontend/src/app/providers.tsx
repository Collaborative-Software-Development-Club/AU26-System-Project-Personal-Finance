import { useEffect, type ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppToaster } from '@/components/feedback/toast'
import { ThemeProvider } from './theme'
import { AUTH_SESSION_EXPIRED_EVENT } from '@/api/session-events'
import { useAuthStore } from '@/store/auth-store'

/** Global providers: theme (class-based dark mode), tooltips, toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  const restoreSession = useAuthStore((state) => state.restoreSession)
  const invalidateSession = useAuthStore((state) => state.invalidateSession)

  useEffect(() => {
    void restoreSession().catch(() => {})

    const refresh = () => {
      const state = useAuthStore.getState()
      if (state.user && !state.pending && document.visibilityState === 'visible') {
        void restoreSession().catch(() => {})
      }
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, invalidateSession)

    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, invalidateSession)
    }
  }, [restoreSession, invalidateSession])

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        {children}
        <AppToaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
