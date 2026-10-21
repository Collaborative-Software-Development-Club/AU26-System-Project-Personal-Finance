import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { APP_NAME } from '@/domain'
import { SidebarBrand, SidebarNav } from './sidebar'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

/** Drawer navigation for < lg screens. */
export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0" aria-describedby={undefined}>
        <SheetHeader className="h-14 justify-center border-b px-2">
          <SheetTitle className="sr-only">{APP_NAME} navigation</SheetTitle>
          <SheetDescription className="sr-only">Main application sections</SheetDescription>
          <SidebarBrand />
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto py-3">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t p-3">
          <UserMenu compact />
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  )
}
