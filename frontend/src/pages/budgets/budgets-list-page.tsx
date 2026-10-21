import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertTriangle, Eye, MoreHorizontal, Pencil, PiggyBank, Plus, Target, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { BudgetProgressBar, BudgetStatusBadge, CategoryChip, MoneyDisplay, MonthPicker, SummaryCard, SummaryCardGrid } from '@/components/financial'
import { SelectInput, type SelectOption } from '@/components/forms'
import { ConfirmDialog, EmptyState, FormErrorMessage, NoResultsState, toast } from '@/components/feedback'
import {
  BUDGET_STATUS_LABEL,
  budgetDisplayName,
  computeBudgetTotals,
  currentMonthKey,
  isValidMonthKey,
  type BudgetProgress,
  type BudgetStatus,
  type Category,
  type Id,
} from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useBudgetProgressForMonth, useCategories, useCategoryMap, useFinanceStore } from '@/store'

type StatusFilter = 'all' | BudgetStatus

const STATUS_OPTIONS: SelectOption<StatusFilter>[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'under', label: BUDGET_STATUS_LABEL.under },
  { value: 'warning', label: BUDGET_STATUS_LABEL.warning },
  { value: 'at', label: BUDGET_STATUS_LABEL.at },
  { value: 'over', label: BUDGET_STATUS_LABEL.over },
]

export default function BudgetsListPage() {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const [searchParams, setSearchParams] = useSearchParams()
  const monthParam = searchParams.get('month')
  const month = monthParam && isValidMonthKey(monthParam) ? monthParam : currentMonthKey()
  const setMonth = (m: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (m === currentMonthKey()) next.delete('month')
        else next.set('month', m)
        return next
      },
      { replace: true },
    )

  const [status, setStatus] = useState<StatusFilter>('all')
  const [deleting, setDeleting] = useState<BudgetProgress | null>(null)

  const allBudgets = useFinanceStore((s) => s.budgets)
  const progress = useBudgetProgressForMonth(month)
  const categories = useCategories()
  const categoryMap = useCategoryMap()
  const deleteBudget = useFinanceStore((s) => s.deleteBudget)

  usePageHeader({
    title: 'Budgets',
    description: 'Track monthly spending limits by category.',
    actions: (
      <Button asChild>
        <Link to="/budgets/new">
          <Plus aria-hidden="true" />
          Add budget
        </Link>
      </Button>
    ),
  })

  const totals = useMemo(() => computeBudgetTotals(progress), [progress])
  const filtered = useMemo(() => (status === 'all' ? progress : progress.filter((p) => p.status === status)), [progress, status])
  const notApplicable = allBudgets.length - progress.length
  const currencies = useMemo(() => new Set(progress.map((p) => p.budget.currency)), [progress])
  const totalsCurrency = currencies.size === 1 ? [...currencies][0] : fmt.defaultCurrency

  const remove = useAsyncAction(async (id: Id) => {
    await deleteBudget(id)
    return true
  })
  const confirmDelete = async () => {
    if (!deleting) return
    const ok = await remove.run(deleting.budget.id)
    if (ok) {
      toast.success('Budget deleted', { description: budgetDisplayName(deleting.budget, categories) })
      setDeleting(null)
    }
  }

  const monthControl = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="budgets-month" className="text-xs text-muted-foreground">
          Month
        </Label>
        <MonthPicker id="budgets-month" value={month} onChange={setMonth} />
      </div>
      {progress.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budgets-status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <SelectInput<StatusFilter> id="budgets-status" value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-44" />
        </div>
      )}
    </div>
  )

  const footnote =
    notApplicable > 0 ? (
      <p className="text-xs text-muted-foreground">
        {notApplicable} budget{notApplicable === 1 ? ' does' : 's do'} not apply to {fmt.month(month)} and {notApplicable === 1 ? 'is' : 'are'} hidden.
      </p>
    ) : null

  if (allBudgets.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={PiggyBank}
          title="No budgets yet"
          description="Create a budget to track spending against your financial goals."
          action={
            <Button asChild>
              <Link to="/budgets/new">
                <Plus aria-hidden="true" />
                Create budget
              </Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (progress.length === 0) {
    return (
      <PageContainer>
        {monthControl}
        <EmptyState
          icon={PiggyBank}
          title="No budgets for this month"
          description={`None of your budgets cover ${fmt.month(month)}. Create one, or pick another month.`}
          action={
            <Button asChild>
              <Link to={`/budgets/new?month=${month}`}>
                <Plus aria-hidden="true" />
                Create budget
              </Link>
            </Button>
          }
        />
        {footnote}
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {monthControl}

      <SummaryCardGrid>
        <SummaryCard label="Total budgeted" amount={totals.budgeted} currency={totalsCurrency} icon={Target} />
        <SummaryCard label="Total spent" amount={totals.spent} currency={totalsCurrency} icon={Wallet} />
        <SummaryCard
          label="Remaining"
          amount={totals.remaining}
          currency={totalsCurrency}
          signed
          icon={PiggyBank}
          footer={totals.remaining < 0 ? <p className="text-xs text-expense">Spending exceeds the combined limits.</p> : undefined}
        />
        <SummaryCard
          label="Over budget"
          value={fmt.number(totals.overCount)}
          icon={AlertTriangle}
          footer={
            <p className="text-xs text-muted-foreground">
              {totals.overCount} of {progress.length} budget{progress.length === 1 ? '' : 's'} over · {totals.warningCount} near or at limit
            </p>
          }
        />
      </SummaryCardGrid>
      {currencies.size > 1 && <p className="-mt-4 text-xs text-muted-foreground">Totals combine budgets in different currencies and are shown in {totalsCurrency}.</p>}

      {remove.status === 'error' && !deleting && <FormErrorMessage message={remove.error} />}

      {filtered.length === 0 ? (
        <NoResultsState onClear={() => setStatus('all')} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Budgets for ${fmt.month(month)}`}>
          {filtered.map((p) => (
            <li key={p.budget.id}>
              <BudgetCard
                progress={p}
                category={categoryMap.get(p.budget.categoryId)}
                name={budgetDisplayName(p.budget, categories)}
                onView={() => navigate(`/budgets/${p.budget.id}`)}
                onEdit={() => navigate(`/budgets/${p.budget.id}/edit`)}
                onDelete={() => setDeleting(p)}
              />
            </li>
          ))}
        </ul>
      )}
      {footnote}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Delete “${budgetDisplayName(deleting.budget, categories)}”?` : 'Delete budget?'}
        description="The budget and its progress history will be removed. Transactions are not affected."
        confirmLabel="Delete budget"
        destructive
        pending={remove.isPending}
        onConfirm={confirmDelete}
      >
        {remove.status === 'error' && <FormErrorMessage message={remove.error} />}
      </ConfirmDialog>
    </PageContainer>
  )
}

function BudgetCard({
  progress,
  category,
  name,
  onView,
  onEdit,
  onDelete,
}: {
  progress: BudgetProgress
  category: Category | undefined
  name: string
  onView(): void
  onEdit(): void
  onDelete(): void
}) {
  const { budget, spent, remaining, percentUsed, status, threshold } = progress
  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/budgets/${budget.id}`} className="block truncate font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {name}
            </Link>
            {category && category.name !== name && <CategoryChip category={category} className="text-xs text-muted-foreground" />}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onView}>
                <Eye aria-hidden="true" /> View details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil aria-hidden="true" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 aria-hidden="true" /> Delete…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm">
            <MoneyDisplay amount={spent} currency={budget.currency} size="lg" />
            <span className="text-muted-foreground"> of </span>
            <MoneyDisplay amount={budget.amount} currency={budget.currency} size="sm" className="text-muted-foreground" />
          </span>
          <BudgetStatusBadge status={status} />
        </div>

        <BudgetProgressBar percentUsed={percentUsed} status={status} threshold={threshold} label={`${name} budget usage`} />

        <p className="mt-auto text-xs text-muted-foreground">
          {remaining >= 0 ? (
            <>
              <MoneyDisplay amount={remaining} currency={budget.currency} size="sm" className="font-medium text-foreground" /> remaining
            </>
          ) : (
            <>
              <MoneyDisplay amount={-remaining} currency={budget.currency} size="sm" className="font-medium text-expense" /> over limit
            </>
          )}
        </p>
      </CardContent>
    </Card>
  )
}
