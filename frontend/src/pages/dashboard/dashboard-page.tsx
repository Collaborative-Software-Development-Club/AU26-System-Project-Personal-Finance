/**
 * P01 — Dashboard. Landing page: net worth, cash flow for the selected
 * reporting period, a six-month trend, recent activity, budget status and
 * spending by category. Every number comes from domain helpers via selectors.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Plus,
  Target,
  Upload,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { EmptyState } from '@/components/feedback'
import { SelectInput } from '@/components/forms/select-input'
import {
  BudgetProgressBar,
  BudgetStatusBadge,
  CategoryBreakdownChart,
  IncomeExpenseChart,
  SummaryCard,
  SummaryCardGrid,
  TransactionTable,
} from '@/components/financial'
import {
  DASHBOARD_RECENT_TRANSACTIONS,
  REPORTING_PERIODS,
  budgetDisplayName,
  compareCashFlow,
  computeBudgetTotals,
  currentMonthKey,
  isPosted,
  lastMonthKeys,
  monthlySeries,
  percentOf,
  periodRange,
  previousRange,
  resolveBudgetStatus,
  totalsByCategory,
  type ReportingPeriod,
} from '@/domain'
import { useFormatters } from '@/hooks'
import {
  useAccountMap,
  useBudgetProgressForMonth,
  useCategories,
  useCategoryMap,
  useIsDatasetEmpty,
  useNetWorth,
  useSettingsStore,
  useTransactions,
  useTransactionsSorted,
} from '@/store'

const PREVIOUS_LABEL: Record<ReportingPeriod, string> = {
  month: 'vs last month',
  quarter: 'vs last quarter',
  year: 'vs last year',
}

const PERIOD_NOUN: Record<ReportingPeriod, string> = {
  month: 'this month',
  quarter: 'this quarter',
  year: 'this year',
}

const TREND_MONTHS = 6
const BUDGET_OVERVIEW_LIMIT = 5

/** Card shell shared by the dashboard panels. */
function Panel({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Remove horizontal padding so tables sit flush with the card edge. */
  flush?: boolean
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={flush ? 'px-0' : undefined}>{children}</CardContent>
    </Card>
  )
}

function WelcomeState() {
  return (
    <EmptyState
      icon={Wallet}
      title="Welcome to your finances"
      description="Start by adding an account, then record transactions or import them from a CSV file."
      action={
        <>
          <Button asChild>
            <Link to="/accounts/new">
              <Plus aria-hidden="true" />
              Add account
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/import">
              <Upload aria-hidden="true" />
              Import CSV
            </Link>
          </Button>
          <p className="basis-full pt-2 text-xs text-muted-foreground">
            Just exploring? You can load sample data from{' '}
            <Link to="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
              Settings
            </Link>
            .
          </p>
        </>
      }
      className="min-h-[360px]"
    />
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const isDatasetEmpty = useIsDatasetEmpty()
  const defaultPeriod = useSettingsStore((s) => s.defaultDashboardPeriod)
  const warningThreshold = useSettingsStore((s) => s.budgetWarningThreshold)

  // Page-local period selection (not persisted; defaults from Settings).
  const [period, setPeriod] = useState<ReportingPeriod>(defaultPeriod)
  const [month] = useState(() => currentMonthKey())

  const transactions = useTransactions()
  const sorted = useTransactionsSorted()
  const categories = useCategories()
  const accountMap = useAccountMap()
  const categoryMap = useCategoryMap()
  const netWorth = useNetWorth()
  const budgetProgress = useBudgetProgressForMonth(month)

  const range = useMemo(() => periodRange(period), [period])
  const prevRange = useMemo(() => previousRange(range), [range])
  const comparison = useMemo(() => compareCashFlow(transactions, range, prevRange), [transactions, range, prevRange])

  const trendMonths = useMemo(() => lastMonthKeys(TREND_MONTHS, month), [month])
  const trend = useMemo(() => monthlySeries(transactions, trendMonths), [transactions, trendMonths])

  const recent = useMemo(() => sorted.filter(isPosted).slice(0, DASHBOARD_RECENT_TRANSACTIONS), [sorted])

  const spending = useMemo(() => totalsByCategory(transactions, categories, 'expense', range), [transactions, categories, range])

  const budgetTotals = useMemo(() => computeBudgetTotals(budgetProgress), [budgetProgress])
  const topBudgets = useMemo(() => budgetProgress.slice(0, BUDGET_OVERVIEW_LIMIT), [budgetProgress])
  const hasBudgets = budgetProgress.length > 0
  const overallBudgetStatus = resolveBudgetStatus(budgetTotals.spent, budgetTotals.budgeted, warningThreshold)
  const overallBudgetPercent = percentOf(budgetTotals.spent, budgetTotals.budgeted)

  const headerActions = useMemo(
    () => (
      <Button asChild>
        <Link to="/transactions/new">
          <Plus aria-hidden="true" />
          Add transaction
        </Link>
      </Button>
    ),
    [],
  )

  usePageHeader({
    title: 'Dashboard',
    description: 'Your financial position and recent activity at a glance.',
    actions: headerActions,
  })

  if (isDatasetEmpty) {
    return (
      <PageContainer>
        <WelcomeState />
      </PageContainer>
    )
  }

  const openCategory = (categoryId: string | null) => {
    const params = new URLSearchParams({ start: range.start, end: range.end })
    if (categoryId) params.set('categoryId', categoryId)
    else params.set('type', 'expense')
    navigate(`/transactions?${params.toString()}`)
  }

  const periodLabel = REPORTING_PERIODS.find((p) => p.value === period)?.label ?? 'Period'
  const monthLabel = fmt.month(month)

  return (
    <PageContainer width="wide">
      {/* Period selector */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{periodLabel.toLowerCase()}</span> · {fmt.date(range.start)} – {fmt.date(range.end)}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="dashboard-period" className="text-xs text-muted-foreground">
            Period
          </Label>
          <SelectInput<ReportingPeriod>
            id="dashboard-period"
            value={period}
            onChange={setPeriod}
            options={REPORTING_PERIODS}
            size="sm"
            className="w-40"
            aria-label="Reporting period"
          />
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCardGrid>
        <SummaryCard
          label="Net worth"
          amount={netWorth.netWorth}
          icon={Landmark}
          footer={
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <dt className="text-muted-foreground">Total assets</dt>
              <dd className="tabular text-right">{fmt.money(netWorth.assets)}</dd>
              <dt className="text-muted-foreground">Total liabilities</dt>
              <dd className="tabular text-right">{fmt.money(netWorth.liabilities)}</dd>
            </dl>
          }
        />
        <SummaryCard
          label={`Income ${PERIOD_NOUN[period]}`}
          amount={comparison.current.income}
          icon={ArrowDownLeft}
          changePct={comparison.incomeChangePct}
          changeLabel={PREVIOUS_LABEL[period]}
          positiveIsGood
        />
        <SummaryCard
          label={`Expenses ${PERIOD_NOUN[period]}`}
          amount={comparison.current.expenses}
          icon={ArrowUpRight}
          changePct={comparison.expensesChangePct}
          changeLabel={PREVIOUS_LABEL[period]}
          positiveIsGood={false}
        />
        {hasBudgets ? (
          <SummaryCard
            label="Remaining budget"
            amount={budgetTotals.remaining}
            signed={budgetTotals.remaining < 0}
            icon={Target}
            footer={
              <div className="space-y-1">
                <BudgetProgressBar
                  percentUsed={overallBudgetPercent}
                  status={overallBudgetStatus}
                  threshold={warningThreshold}
                  label={`Overall budget usage for ${monthLabel}`}
                  size="sm"
                />
                <p className="text-xs text-muted-foreground">
                  {fmt.money(budgetTotals.spent)} of {fmt.money(budgetTotals.budgeted)} spent in {monthLabel}
                  {budgetTotals.overCount > 0 && ` · ${budgetTotals.overCount} over`}
                </p>
              </div>
            }
          />
        ) : (
          <SummaryCard
            label="Remaining budget"
            value={<span className="text-muted-foreground">—</span>}
            icon={Target}
            footer={
              <p className="text-xs text-muted-foreground">
                No budgets for {monthLabel}.{' '}
                <Link to="/budgets/new" className="font-medium text-primary underline-offset-4 hover:underline">
                  Create one
                </Link>
              </p>
            }
          />
        )}
      </SummaryCardGrid>

      {/* Main grid: 1 col → 2 cols (md) → 12 cols (lg) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <Panel title="Income vs expenses" description={`Last ${TREND_MONTHS} months`} className="lg:col-span-7">
          <IncomeExpenseChart data={trend} height={280} />
        </Panel>

        <Panel
          title="Spending by category"
          description={`${periodLabel} · select a category to see its transactions`}
          className="lg:col-span-5"
        >
          <CategoryBreakdownChart data={spending} variant="donut" height={280} onSelect={openCategory} />
        </Panel>

        <Panel
          title="Recent transactions"
          description={`Latest ${DASHBOARD_RECENT_TRANSACTIONS} posted transactions`}
          className="lg:col-span-8"
          flush
          action={
            <Button asChild variant="link" size="sm">
              <Link to="/transactions">View all</Link>
            </Button>
          }
        >
          <TransactionTable
            transactions={recent}
            accounts={accountMap}
            categories={categoryMap}
            actions={false}
            dense
            className="rounded-none bg-transparent ring-0"
            emptyContent={
              <EmptyState
                size="sm"
                title="No transactions yet"
                description="Record your first income or expense to see it here."
                className="m-4"
                action={
                  <Button asChild size="sm">
                    <Link to="/transactions/new">
                      <Plus aria-hidden="true" />
                      Add transaction
                    </Link>
                  </Button>
                }
              />
            }
          />
        </Panel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel title="Quick actions">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <Button asChild variant="outline" className="justify-start">
                <Link to="/transactions/new">
                  <Plus aria-hidden="true" />
                  Add transaction
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/transfers/new">
                  <ArrowLeftRight aria-hidden="true" />
                  Transfer money
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/budgets/new">
                  <PiggyBank aria-hidden="true" />
                  Add budget
                </Link>
              </Button>
            </div>
          </Panel>

          <Panel
            title="Budget overview"
            description={monthLabel}
            className="flex-1"
            action={
              <Button asChild variant="link" size="sm">
                <Link to="/budgets">View all</Link>
              </Button>
            }
          >
            {hasBudgets ? (
              <ul className="flex flex-col divide-y">
                {topBudgets.map((p) => {
                  const name = budgetDisplayName(p.budget, categories)
                  const category = categoryMap.get(p.budget.categoryId)
                  return (
                    <li key={p.budget.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        to={`/budgets/${p.budget.id}`}
                        className="flex flex-col gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                            {category && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />}
                            <span className="truncate">{name}</span>
                          </span>
                          <BudgetStatusBadge status={p.status} className="shrink-0" />
                        </div>
                        <BudgetProgressBar percentUsed={p.percentUsed} status={p.status} threshold={p.threshold} label={`${name} budget usage`} size="sm" />
                        <p className="text-xs text-muted-foreground">
                          {fmt.money(p.spent, p.budget.currency)} of {fmt.money(p.budget.amount, p.budget.currency)}
                          {p.remaining >= 0 ? ` · ${fmt.money(p.remaining, p.budget.currency)} left` : ` · ${fmt.money(-p.remaining, p.budget.currency)} over`}
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                size="sm"
                icon={Target}
                title="No budgets this month"
                description={`Set a monthly limit for a category to track it for ${monthLabel}.`}
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/budgets/new">
                      <Plus aria-hidden="true" />
                      Add budget
                    </Link>
                  </Button>
                }
              />
            )}
          </Panel>
        </div>
      </div>
    </PageContainer>
  )
}
