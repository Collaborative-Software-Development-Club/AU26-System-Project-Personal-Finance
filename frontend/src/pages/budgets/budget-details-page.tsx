import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowRight, ChevronLeft, ChevronRight, Pencil, Percent, PiggyBank, Target, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PageContainer, PageSection } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import {
  BudgetProgressBar,
  BudgetStatusBadge,
  BudgetVsActualChart,
  CategoryChip,
  MoneyDisplay,
  SummaryCard,
  SummaryCardGrid,
  TransactionTable,
  sortTransactions,
  type TransactionSort,
} from '@/components/financial'
import { MonthInput } from '@/components/forms'
import { ConfirmDialog, EmptyState, FormErrorMessage, toast } from '@/components/feedback'
import {
  budgetAppliesToMonth,
  budgetDisplayName,
  budgetTransactions,
  compareMonthKeys,
  computeBudgetProgress,
  currentMonthKey,
  lastMonthKeys,
  monthRange,
  shiftMonth,
  type Budget,
  type Id,
  type MonthKey,
} from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccountMap, useBudgetProgressForMonth, useCategories, useCategoryMap, useFinanceStore, useSettingsStore, useTransactions } from '@/store'
import { EntityNotFound } from '@/pages/errors/entity-not-found'

const TREND_MONTHS = 6

export default function BudgetDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const budget = useFinanceStore((s) => (id ? s.budgets.find((b) => b.id === id) ?? null : null))
  if (!budget) return <EntityNotFound entity="Budget" backTo="/budgets" backLabel="Back to budgets" />
  return <BudgetDetails key={budget.id} budget={budget} />
}

/** Clamp a month into the budget's [startMonth, endMonth] range. */
function clampToRange(budget: Budget, month: MonthKey): MonthKey {
  if (compareMonthKeys(month, budget.startMonth) < 0) return budget.startMonth
  if (budget.endMonth && compareMonthKeys(month, budget.endMonth) > 0) return budget.endMonth
  return month
}

function BudgetDetails({ budget }: { budget: Budget }) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const categories = useCategories()
  const categoryMap = useCategoryMap()
  const accountMap = useAccountMap()
  const transactions = useTransactions()
  const defaultThreshold = useSettingsStore((s) => s.budgetWarningThreshold)
  const deleteBudget = useFinanceStore((s) => s.deleteBudget)

  const [month, setMonth] = useState<MonthKey>(() => clampToRange(budget, currentMonthKey()))
  const [sort, setSort] = useState<TransactionSort>({ key: 'date', direction: 'desc' })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const name = budgetDisplayName(budget, categories)
  const category = categoryMap.get(budget.categoryId)

  // Same numbers as the list page; fall back to a direct computation when the
  // selected month is (unexpectedly) outside the budget's range.
  const monthProgress = useBudgetProgressForMonth(month)
  const progress = useMemo(
    () => monthProgress.find((p) => p.budget.id === budget.id) ?? computeBudgetProgress(budget, transactions, month, defaultThreshold),
    [monthProgress, budget, transactions, month, defaultThreshold],
  )

  const contributing = useMemo(
    () => sortTransactions(budgetTransactions(budget, transactions, month), sort, accountMap, categoryMap),
    [budget, transactions, month, sort, accountMap, categoryMap],
  )

  const trend = useMemo(
    () =>
      lastMonthKeys(TREND_MONTHS, month)
        .filter((m) => budgetAppliesToMonth(budget, m))
        .map((m) => {
          const p = computeBudgetProgress(budget, transactions, m, defaultThreshold)
          return { name: fmt.month(m, 'short'), budgeted: budget.amount, spent: p.spent }
        }),
    [budget, transactions, month, defaultThreshold, fmt],
  )

  const range = monthRange(month)
  const transactionsLink = `/transactions?categoryId=${encodeURIComponent(budget.categoryId)}&type=expense&start=${range.start}&end=${range.end}`
  const periodLabel = budget.endMonth ? `${fmt.month(budget.startMonth, 'short')} – ${fmt.month(budget.endMonth, 'short')}` : `From ${fmt.month(budget.startMonth, 'short')}, open-ended`

  const remove = useAsyncAction(async (budgetId: Id) => {
    await deleteBudget(budgetId)
    return true
  })
  const onDelete = async () => {
    const ok = await remove.run(budget.id)
    if (ok) {
      toast.success('Budget deleted', { description: name })
      navigate('/budgets')
    }
  }

  usePageHeader({
    title: name,
    description: `${category?.name ?? 'Unknown category'} · Monthly · ${periodLabel}`,
    breadcrumbs: [{ label: 'Budgets', to: '/budgets' }],
    actions: (
      <>
        <Button variant="outline" asChild>
          <Link to={`/budgets/${budget.id}/edit`}>
            <Pencil aria-hidden="true" />
            Edit
          </Link>
        </Button>
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </>
    ),
  })

  const canGoBack = compareMonthKeys(shiftMonth(month, -1), budget.startMonth) >= 0
  const canGoForward = !budget.endMonth || compareMonthKeys(shiftMonth(month, 1), budget.endMonth) <= 0

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <CategoryChip category={category} />
          <BudgetStatusBadge status={progress.status} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-month" className="text-xs text-muted-foreground">
            Month
          </Label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} disabled={!canGoBack} aria-label="Previous month">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <MonthInput
              id="budget-month"
              value={month}
              onChange={(m) => m && setMonth(clampToRange(budget, m))}
              min={budget.startMonth}
              max={budget.endMonth ?? undefined}
              className="w-44 text-center"
            />
            <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canGoForward} aria-label="Next month">
              <ChevronRight aria-hidden="true" />
            </Button>
            <span className="sr-only" aria-live="polite">
              Showing {fmt.month(month)}
            </span>
          </div>
        </div>
      </div>

      <SummaryCardGrid>
        <SummaryCard label="Limit" amount={budget.amount} currency={budget.currency} icon={Target} />
        <SummaryCard label="Spent" amount={progress.spent} currency={budget.currency} icon={Wallet} />
        <SummaryCard
          label="Remaining"
          amount={progress.remaining}
          currency={budget.currency}
          signed
          icon={PiggyBank}
          footer={progress.remaining < 0 ? <p className="text-xs text-expense">Over the limit for {fmt.month(month, 'short')}.</p> : undefined}
        />
        <SummaryCard
          label="Used"
          value={fmt.percent(progress.percentUsed)}
          icon={Percent}
          footer={<p className="text-xs text-muted-foreground">Warns at {fmt.percent(progress.threshold * 100)}</p>}
        />
      </SummaryCardGrid>

      <Card size="sm">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span>
              <MoneyDisplay amount={progress.spent} currency={budget.currency} className="font-medium" />
              <span className="text-muted-foreground"> spent of </span>
              <MoneyDisplay amount={budget.amount} currency={budget.currency} className="text-muted-foreground" />
            </span>
            <span className="text-muted-foreground">{fmt.month(month)}</span>
          </div>
          <BudgetProgressBar percentUsed={progress.percentUsed} status={progress.status} threshold={progress.threshold} label={`${name} budget usage for ${fmt.month(month)}`} />
        </CardContent>
      </Card>

      <PageSection title="Spending trend" description={`Budgeted versus spent for the last ${TREND_MONTHS} months inside this budget's period.`}>
        <Card size="sm">
          <CardContent>
            <BudgetVsActualChart data={trend} currency={budget.currency} height={220} />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="Contributing transactions"
        description={`Posted expenses in ${category?.name ?? 'this category'} during ${fmt.month(month)}.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={transactionsLink}>
              All category transactions
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        <TransactionTable
          transactions={contributing}
          accounts={accountMap}
          categories={categoryMap}
          actions={false}
          sort={sort}
          onSortChange={setSort}
          emptyContent={
            <EmptyState
              size="sm"
              title="No spending this month"
              description={`No posted expense in ${category?.name ?? 'this category'} falls in ${fmt.month(month)}.`}
              className="m-3"
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/transactions/new?type=expense&categoryId=${encodeURIComponent(budget.categoryId)}`}>Add expense</Link>
                </Button>
              }
            />
          }
        />
      </PageSection>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${name}”?`}
        description="The budget and its progress history will be removed. Transactions are not affected."
        confirmLabel="Delete budget"
        destructive
        pending={remove.isPending}
        onConfirm={onDelete}
      >
        {remove.status === 'error' && <FormErrorMessage message={remove.error} />}
      </ConfirmDialog>
    </PageContainer>
  )
}
