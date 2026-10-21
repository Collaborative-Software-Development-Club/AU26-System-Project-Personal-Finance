/**
 * P15 — Monthly Summary. Everything about one calendar month: totals and
 * comparison with the previous month, spending/income by category, daily
 * activity, budget performance, largest expenses and account balance changes.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowDownLeft, ArrowUpRight, CalendarX2, Percent, PiggyBank, Plus, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { EmptyState } from '@/components/feedback'
import {
  AccountTypeBadge,
  BudgetStatusBadge,
  CategoryBreakdownChart,
  CategoryChip,
  DailyActivityChart,
  MoneyDisplay,
  MonthPicker,
  SummaryCard,
  SummaryCardGrid,
  TransactionTable,
} from '@/components/financial'
import {
  balanceHistory,
  budgetDisplayName,
  compareCashFlow,
  currentMonthKey,
  dailySeries,
  isLiabilityAccountType,
  isPosted,
  isWithinRange,
  monthRange,
  percentChange,
  shiftMonth,
  totalsByCategory,
  type MinorUnits,
} from '@/domain'
import { useFormatters } from '@/hooks'
import {
  useAccountMap,
  useActiveAccountsWithBalance,
  useBudgetProgressForMonth,
  useCategories,
  useCategoryMap,
  useIsDatasetEmpty,
  useTransactions,
} from '@/store'
import { cn } from '@/lib/utils'

const TOP_EXPENSES = 5

/** Savings rate as an integer percent of income, computed from minor units. */
function savingsRate(net: MinorUnits, income: MinorUnits): number | null {
  if (income <= 0) return null
  return Math.round((net * 100) / income)
}

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

export default function MonthlySummaryPage() {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const isDatasetEmpty = useIsDatasetEmpty()
  const [month, setMonth] = useState(() => currentMonthKey())

  const transactions = useTransactions()
  const categories = useCategories()
  const accountMap = useAccountMap()
  const categoryMap = useCategoryMap()
  const accounts = useActiveAccountsWithBalance()
  const budgetProgress = useBudgetProgressForMonth(month)

  const previousMonth = useMemo(() => shiftMonth(month, -1), [month])
  const range = useMemo(() => monthRange(month), [month])
  const prevRange = useMemo(() => monthRange(previousMonth), [previousMonth])

  const comparison = useMemo(() => compareCashFlow(transactions, range, prevRange), [transactions, range, prevRange])
  const { current, previous } = comparison
  const netChangePct = percentChange(current.net, previous.net)
  const rate = savingsRate(current.net, current.income)
  const previousRate = savingsRate(previous.net, previous.income)

  const spending = useMemo(() => totalsByCategory(transactions, categories, 'expense', range), [transactions, categories, range])
  const incomeByCategory = useMemo(() => totalsByCategory(transactions, categories, 'income', range), [transactions, categories, range])
  const daily = useMemo(() => dailySeries(transactions, range), [transactions, range])

  const topExpenses = useMemo(
    () =>
      transactions
        .filter((t) => isPosted(t) && t.type === 'expense' && isWithinRange(t.date, range))
        .sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
        .slice(0, TOP_EXPENSES),
    [transactions, range],
  )

  const balanceChanges = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((account) => {
          const [start, end] = balanceHistory(account, transactions, [previousMonth, month])
          const startBalance = start?.balance ?? account.openingBalance
          const endBalance = end?.balance ?? startBalance
          return { account, startBalance, endBalance, delta: endBalance - startBalance }
        }),
    [accounts, transactions, previousMonth, month],
  )

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
    title: 'Monthly Summary',
    description: 'A detailed breakdown of one month of income, spending and budgets.',
    actions: headerActions,
  })

  if (isDatasetEmpty) {
    return (
      <PageContainer>
        <EmptyState
          icon={CalendarX2}
          title="Nothing to summarise yet"
          description="Add an account and record some transactions to see a monthly breakdown."
          action={
            <>
              <Button asChild>
                <Link to="/accounts/new">
                  <Plus aria-hidden="true" />
                  Add account
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/transactions/new">Add transaction</Link>
              </Button>
            </>
          }
        />
      </PageContainer>
    )
  }

  const monthLabel = fmt.month(month)
  const previousLabel = fmt.month(previousMonth, 'short')
  const isEmptyMonth = current.transactionCount === 0

  const openCategory = (categoryId: string | null) => {
    const params = new URLSearchParams({ start: range.start, end: range.end, type: 'expense' })
    if (categoryId) params.set('categoryId', categoryId)
    navigate(`/transactions?${params.toString()}`)
  }

  const transactionsListHref = `/transactions?${new URLSearchParams({ start: range.start, end: range.end }).toString()}`

  return (
    <PageContainer width="wide">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={month} onChange={setMonth} id="summary-month" />
        <p className="text-sm text-muted-foreground">
          {fmt.date(range.start)} – {fmt.date(range.end)} · {current.transactionCount}{' '}
          {current.transactionCount === 1 ? 'transaction' : 'transactions'}
        </p>
      </div>

      {isEmptyMonth ? (
        <EmptyState
          icon={CalendarX2}
          title={`No activity in ${monthLabel}`}
          description="There are no posted income or expense transactions in this month. Try another month or record a transaction."
          action={
            <>
              <Button type="button" variant="outline" onClick={() => setMonth(currentMonthKey())}>
                Go to current month
              </Button>
              <Button asChild>
                <Link to="/transactions/new">
                  <Plus aria-hidden="true" />
                  Add transaction
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          <SummaryCardGrid>
            <SummaryCard
              label="Income"
              amount={current.income}
              icon={ArrowDownLeft}
              changePct={comparison.incomeChangePct}
              changeLabel={`vs ${previousLabel}`}
              positiveIsGood
              footer={<p className="text-xs text-muted-foreground">{previousLabel}: {fmt.money(previous.income)}</p>}
            />
            <SummaryCard
              label="Expenses"
              amount={current.expenses}
              icon={ArrowUpRight}
              changePct={comparison.expensesChangePct}
              changeLabel={`vs ${previousLabel}`}
              positiveIsGood={false}
              footer={<p className="text-xs text-muted-foreground">{previousLabel}: {fmt.money(previous.expenses)}</p>}
            />
            <SummaryCard
              label="Net cash flow"
              amount={current.net}
              signed
              icon={Scale}
              changePct={netChangePct}
              changeLabel={`vs ${previousLabel}`}
              positiveIsGood
              footer={<p className="text-xs text-muted-foreground">{previousLabel}: {fmt.signedMoney(previous.net)}</p>}
            />
            <SummaryCard
              label="Savings rate"
              value={rate === null ? <span className="text-muted-foreground">—</span> : `${rate}%`}
              icon={Percent}
              footer={
                <p className="text-xs text-muted-foreground">
                  {rate === null
                    ? 'No income this month to compare against.'
                    : `Net cash flow as a share of income · ${previousLabel}: ${previousRate === null ? '—' : `${previousRate}%`}`}
                </p>
              }
            />
          </SummaryCardGrid>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
            <Panel
              title="Spending by category"
              description="Select a category to see its transactions"
              className="lg:col-span-7"
              action={
                <Button asChild variant="link" size="sm">
                  <Link to={`${transactionsListHref}&type=expense`}>All expenses</Link>
                </Button>
              }
            >
              <CategoryBreakdownChart data={spending} variant="bars" height={260} onSelect={openCategory} />
            </Panel>

            <Panel title="Income by category" className="lg:col-span-5" flush>
              {incomeByCategory.length === 0 ? (
                <p className="px-4 text-sm text-muted-foreground">No income recorded this month.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Category</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                      <TableHead className="pr-4 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeByCategory.map((row) => (
                      <TableRow key={row.categoryId ?? '__none__'}>
                        <TableCell className="pl-4">
                          <CategoryChip category={row.category} />
                        </TableCell>
                        <TableCell className="tabular text-right text-muted-foreground">{Math.round(row.share)}%</TableCell>
                        <TableCell className="pr-4 text-right">
                          <MoneyDisplay amount={row.total} size="sm" className="font-medium" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>

            <Panel title="Daily activity" description={`Income and expenses per day in ${monthLabel}`} className="md:col-span-2 lg:col-span-12">
              <DailyActivityChart data={daily} height={240} />
            </Panel>

            <Panel
              title="Budget performance"
              description={`${budgetProgress.length} ${budgetProgress.length === 1 ? 'budget applies' : 'budgets apply'} to ${monthLabel}`}
              className="lg:col-span-6"
              flush
              action={
                <Button asChild variant="link" size="sm">
                  <Link to="/budgets">Manage budgets</Link>
                </Button>
              }
            >
              {budgetProgress.length === 0 ? (
                <div className="px-4">
                  <EmptyState
                    size="sm"
                    icon={PiggyBank}
                    title="No budgets for this month"
                    description="Create a monthly budget to compare limits with actual spending."
                    action={
                      <Button asChild size="sm" variant="outline">
                        <Link to="/budgets/new">
                          <Plus aria-hidden="true" />
                          Add budget
                        </Link>
                      </Button>
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Budget</TableHead>
                      <TableHead className="text-right">Limit</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="pr-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetProgress.map((p) => (
                      <TableRow key={p.budget.id}>
                        <TableCell className="pl-4">
                          <Link to={`/budgets/${p.budget.id}`} className="font-medium underline-offset-4 hover:underline">
                            {budgetDisplayName(p.budget, categories)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={p.budget.amount} currency={p.budget.currency} size="sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={p.spent} currency={p.budget.currency} size="sm" className={cn(p.status === 'over' && 'font-semibold text-expense')} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <BudgetStatusBadge status={p.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>

            <Panel
              title="Largest expenses"
              description={`Top ${TOP_EXPENSES} posted expenses in ${monthLabel}`}
              className="lg:col-span-6"
              flush
              action={
                <Button asChild variant="link" size="sm">
                  <Link to={`${transactionsListHref}&type=expense`}>View all</Link>
                </Button>
              }
            >
              <TransactionTable
                transactions={topExpenses}
                accounts={accountMap}
                categories={categoryMap}
                actions={false}
                dense
                className="rounded-none bg-transparent ring-0"
                emptyContent={<p className="px-4 py-6 text-center text-sm text-muted-foreground">No expenses recorded this month.</p>}
              />
            </Panel>

            <Panel
              title="Account balance changes"
              description={`Balance at the end of ${previousLabel} compared with the end of ${fmt.month(month, 'short')}. Credit accounts show the amount owed.`}
              className="md:col-span-2 lg:col-span-12"
              flush
            >
              {balanceChanges.length === 0 ? (
                <p className="px-4 text-sm text-muted-foreground">No active accounts.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Account</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="text-right">Start balance</TableHead>
                      <TableHead className="text-right">End balance</TableHead>
                      <TableHead className="pr-4 text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceChanges.map(({ account, startBalance, endBalance, delta }) => {
                      // For liability accounts a growing balance is bad news.
                      const effect = isLiabilityAccountType(account.type) ? -delta : delta
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="pl-4">
                            <Link to={`/accounts/${account.id}`} className="flex items-center gap-2 font-medium underline-offset-4 hover:underline">
                              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: account.color ?? 'var(--muted-foreground)' }} aria-hidden="true" />
                              {account.name}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <AccountTypeBadge type={account.type} />
                          </TableCell>
                          <TableCell className="text-right">
                            <MoneyDisplay amount={startBalance} currency={account.currency} size="sm" />
                          </TableCell>
                          <TableCell className="text-right">
                            <MoneyDisplay amount={endBalance} currency={account.currency} size="sm" />
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <span className={cn('tabular text-sm font-medium', effect > 0 && 'text-income', effect < 0 && 'text-expense', delta === 0 && 'text-muted-foreground')}>
                              {fmt.signedMoney(delta, account.currency)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </div>
        </>
      )}
    </PageContainer>
  )
}
