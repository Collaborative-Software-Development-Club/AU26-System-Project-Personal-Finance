import { Link } from 'react-router'
import { Bell, CircleHelp, Repeat, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { currentMonthKey, todayISO } from '@/domain'
import { useFinanceStore } from '@/store/finance-store'
import { useBudgetProgressForMonth } from '@/store/selectors'
import { useFormatters } from '@/hooks/use-formatters'

/**
 * Header notification area. Derived entirely from current state:
 *  - operations with unknown outcome
 *  - budgets over / near limit this month
 *  - recurring rules due in the next 3 days
 */
export function NotificationsMenu() {
  const fmt = useFormatters()
  const unresolved = useFinanceStore((s) => s.unresolvedOperations)
  const rules = useFinanceStore((s) => s.recurringRules)
  const progress = useBudgetProgressForMonth(currentMonthKey())
  const alerts = progress.filter((p) => p.status === 'over' || p.status === 'warning' || p.status === 'at')
  const today = todayISO()
  const soon = new Date()
  soon.setDate(soon.getDate() + 3)
  const soonISO = soon.toISOString().slice(0, 10)
  const upcoming = rules.filter((r) => r.status === 'active' && r.nextRunDate && r.nextRunDate >= today && r.nextRunDate <= soonISO)
  const count = unresolved.length + alerts.length + upcoming.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${count ? `, ${count} new` : ''}`}>
          <Bell aria-hidden="true" />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground" aria-hidden="true">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 && <div className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
        {unresolved.map((op) => (
          <DropdownMenuItem key={op.idempotencyKey} asChild>
            <Link to="/transfers" className="items-start">
              <CircleHelp className="mt-0.5 text-warning" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="font-medium">Outcome unknown</span>
                <span className="text-xs text-muted-foreground">{op.summary}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        {alerts.slice(0, 4).map((p) => (
          <DropdownMenuItem key={p.budget.id} asChild>
            <Link to={`/budgets/${p.budget.id}`} className="items-start">
              <TriangleAlert className={p.status === 'over' ? 'mt-0.5 text-expense' : 'mt-0.5 text-warning'} aria-hidden="true" />
              <span className="flex flex-col">
                <span className="font-medium">{p.status === 'over' ? 'Over budget' : 'Near budget limit'}</span>
                <span className="text-xs text-muted-foreground">
                  {fmt.money(p.spent, p.budget.currency)} of {fmt.money(p.budget.amount, p.budget.currency)} used
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        {upcoming.slice(0, 4).map((r) => (
          <DropdownMenuItem key={r.id} asChild>
            <Link to="/recurring" className="items-start">
              <Repeat className="mt-0.5 text-muted-foreground" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="font-medium">{r.description}</span>
                <span className="text-xs text-muted-foreground">Scheduled {fmt.date(r.nextRunDate!)} · {fmt.money(r.amount, r.currency)}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
