import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Receipt,
  Repeat,
  Settings,
  Tags,
  Target,
  Upload,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Marks the item active for any nested route. */
  match?: string[]
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Accounts', to: '/accounts', icon: Wallet },
  { label: 'Transactions', to: '/transactions', icon: Receipt },
  { label: 'Transfers', to: '/transfers', icon: ArrowLeftRight },
  { label: 'Budgets', to: '/budgets', icon: Target },
  { label: 'Recurring', to: '/recurring', icon: Repeat },
  { label: 'Monthly Summary', to: '/summary', icon: CalendarDays },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Import', to: '/import', icon: Upload },
  { label: 'Categories', to: '/categories', icon: Tags },
]

export const SECONDARY_NAV: NavItem[] = [{ label: 'Settings', to: '/settings', icon: Settings }]
