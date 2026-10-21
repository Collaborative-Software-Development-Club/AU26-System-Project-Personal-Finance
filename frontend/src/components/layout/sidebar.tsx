import { NavLink } from 'react-router'
import { Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME, APP_TAGLINE } from '@/domain'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from './nav-items'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none',
          'focus-visible:ring-3 focus-visible:ring-ring/50',
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-4 shrink-0', isActive ? 'text-sidebar-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground')} aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Landmark className="size-4" aria-hidden="true" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">{APP_NAME}</div>
        <div className="text-xs text-muted-foreground">{APP_TAGLINE}</div>
      </div>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-2">
      {PRIMARY_NAV.map((item) => (
        <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
      ))}
      <div className="my-2 border-t" role="presentation" />
      {SECONDARY_NAV.map((item) => (
        <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  )
}

/** Persistent desktop sidebar (≥ lg). */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center border-b px-2">
        <SidebarBrand />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto py-3">
        <SidebarNav />
      </div>
      <div className="flex items-center justify-between gap-2 border-t p-3">
        <UserMenu compact />
        <ThemeToggle />
      </div>
    </aside>
  )
}
