import { Outlet } from 'react-router'
import { Landmark } from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from '@/domain'
import { ThemeToggle } from './theme-toggle'

/** Centered card layout for Login / Register (no sidebar). */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="size-4" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{APP_NAME}</div>
            <div className="text-xs text-muted-foreground">{APP_TAGLINE}</div>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
