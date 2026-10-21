import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppToaster } from '@/components/feedback/toast'
import { ThemeProvider } from './theme'

/** Global providers: theme (class-based dark mode), tooltips, toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        {children}
        <AppToaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
