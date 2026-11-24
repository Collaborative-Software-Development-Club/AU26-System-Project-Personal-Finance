import { Link, useNavigate } from 'react-router'
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { useAsyncAction } from '@/hooks'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const authBusy = useAuthStore((s) => s.pending !== null || s.status === 'loading')
  const navigate = useNavigate()
  const signOut = useAsyncAction(async () => {
    await logout()
    return true
  })
  const checkSession = useAsyncAction(restoreSession)
  const handleLogout = async () => {
    const succeeded = await signOut.run()
    if (!succeeded) return
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }
  const name = user?.name ?? 'Account'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn('h-auto justify-start gap-2 px-2 py-1.5', compact ? 'min-w-0 flex-1' : '')}
          aria-label={`Account menu for ${name}`}
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          {compact && (
            <>
              <span className="min-w-0 flex-1 truncate text-left text-sm">{name}</span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signOut.isPending || authBusy}
          onSelect={(event) => {
            event.preventDefault()
            void handleLogout()
          }}
        >
          <LogOut aria-hidden="true" />
          {signOut.isPending ? 'Signing out...' : 'Log out'}
        </DropdownMenuItem>
        {signOut.status === 'unknown' ? (
          <div className="p-2">
            <OutcomeUnknownNotice
              title="Logout could not be confirmed"
              description={signOut.error ?? 'Check your session before trying again.'}
              onCheckStatus={() => void checkSession.run()}
              checking={checkSession.isPending}
            />
          </div>
        ) : (
          <FormErrorMessage message={signOut.error} className="m-2" />
        )}
        <FormErrorMessage message={checkSession.error} className="m-2" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
