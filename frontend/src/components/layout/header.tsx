import { MobileNavigation } from './mobile-navigation'
import { Breadcrumbs } from './breadcrumbs'
import { usePageHeaderMeta } from './page-header-context'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'
import { NotificationsMenu } from '@/components/feedback/notifications-menu'

/** Global header: page title, breadcrumbs, primary action, notifications, profile. */
export function Header() {
  const meta = usePageHeaderMeta()
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <MobileNavigation />
        <div className="min-w-0 flex-1">
          {meta?.breadcrumbs && meta.breadcrumbs.length > 0 && (
            <Breadcrumbs items={meta.breadcrumbs} current={meta.title} />
          )}
          <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">{meta?.title ?? ''}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-2 sm:flex">{meta?.actions}</div>
          <NotificationsMenu />
          <div className="hidden lg:hidden md:block">
            <ThemeToggle />
          </div>
          <div className="lg:hidden">
            <UserMenu />
          </div>
        </div>
      </div>
      {meta?.actions && (
        <div className="flex items-center gap-2 overflow-x-auto border-t px-4 py-2 sm:hidden">{meta.actions}</div>
      )}
    </header>
  )
}
