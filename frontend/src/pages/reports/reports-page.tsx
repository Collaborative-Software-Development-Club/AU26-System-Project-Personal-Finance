/**
 * P16 — Reports. Five report types, each a chart plus the matching data table,
 * driven by combinable filters (period, account, category). The table rows
 * are what the CSV export serialises, so the file always matches the screen.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BarChart3, Download, FilterX, Landmark, Plus, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { EmptyState, NoResultsState, toast } from '@/components/feedback'
import { SelectInput, type SelectOption } from '@/components/forms/select-input'
import {
  AccountSelector,
  CategoryBreakdownChart,
  CategorySelector,
  DateRangeFilter,
  IncomeExpenseChart,
  TrendLineChart,
  type DateRangeValue,
} from '@/components/financial'
import {
  REPORTING_PERIODS,
  balanceHistory,
  computeCashFlow,
  currentMonthKey,
  monthKeysBetween,
  monthRange,
  monthlySeries,
  percentChange,
  periodRange,
  shiftMonth,
  toMonthKey,
  totalsByCategory,
  type CategoryTotal,
  type DateRange,
  type Id,
  type MonthKey,
  type ReportingPeriod,
} from '@/domain'
import { useFormatters } from '@/hooks'
import { useAccountMap, useAccountsWithBalance, useCategories, useCategoryMap, useTransactions } from '@/store'
import { buildCsv, downloadCsv, reportFileName } from './export-csv'
import { REPORT_TYPES, reportToCsvRows, type ReportCell, type ReportTableData, type ReportType } from './report-model'
import { ReportTable } from './report-table'

type PeriodPreset = ReportingPeriod | 'last-6-months' | 'last-12-months' | 'custom'

const PRESETS: SelectOption<PeriodPreset>[] = [
  ...REPORTING_PERIODS,
  { value: 'last-6-months', label: 'Last 6 months' },
  { value: 'last-12-months', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
]

const DEFAULT_PRESET: PeriodPreset = 'last-6-months'
const DEFAULT_TYPE: ReportType = 'income-expense'
const EMPTY_RANGE: DateRangeValue = { start: '', end: '' }

function lastMonthsRange(count: number, end: MonthKey): DateRange {
  return { start: monthRange(shiftMonth(end, -(count - 1))).start, end: monthRange(end).end }
}

/** Resolve the preset + custom inputs to a concrete inclusive range. */
function resolveRange(preset: PeriodPreset, custom: DateRangeValue, bounds: DateRange | null, thisMonth: MonthKey): DateRange {
  switch (preset) {
    case 'month':
    case 'quarter':
    case 'year':
      return periodRange(preset)
    case 'last-6-months':
      return lastMonthsRange(6, thisMonth)
    case 'last-12-months':
      return lastMonthsRange(12, thisMonth)
    case 'custom': {
      const fallback = monthRange(thisMonth)
      const start = custom.start || bounds?.start || fallback.start
      const end = custom.end || bounds?.end || fallback.end
      return start <= end ? { start, end } : { start: end, end: start }
    }
  }
}

function categoryTable(totals: CategoryTotal[], grandTotal: number, amountHeader: string): ReportTableData {
  const count = totals.reduce((s, t) => s + t.count, 0)
  return {
    columns: [{ header: 'Category' }, { header: 'Transactions', align: 'right' }, { header: 'Share', align: 'right' }, { header: amountHeader, align: 'right' }],
    rows: totals.map((t) => ({
      key: t.categoryId ?? '__uncategorised__',
      cells: [
        { kind: 'text', value: t.category?.name ?? 'Uncategorised' },
        { kind: 'count', value: t.count },
        { kind: 'percent', value: t.share },
        { kind: 'money', amount: t.total },
      ],
    })),
    totals: [
      { kind: 'text', value: 'Total' },
      { kind: 'count', value: count },
      { kind: 'percent', value: totals.length > 0 ? 100 : 0 },
      { kind: 'money', amount: grandTotal },
    ],
  }
}

export default function ReportsPage() {
  const fmt = useFormatters()
  const transactions = useTransactions()
  const categories = useCategories()
  const accounts = useAccountsWithBalance()
  const accountMap = useAccountMap()
  const categoryMap = useCategoryMap()

  const [thisMonth] = useState(() => currentMonthKey())
  const [type, setType] = useState<ReportType>(DEFAULT_TYPE)
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET)
  const [custom, setCustom] = useState<DateRangeValue>(EMPTY_RANGE)
  const [accountId, setAccountId] = useState<Id | ''>('')
  const [categoryId, setCategoryId] = useState<Id | ''>('')

  const hasData = transactions.length > 0
  const filtersActive = preset !== DEFAULT_PRESET || accountId !== '' || categoryId !== ''

  const clearFilters = () => {
    setPreset(DEFAULT_PRESET)
    setCustom(EMPTY_RANGE)
    setAccountId('')
    setCategoryId('')
  }

  // Earliest/latest transaction dates, used to bound an open-ended custom range.
  const bounds = useMemo<DateRange | null>(() => {
    if (transactions.length === 0) return null
    let start = transactions[0]!.date
    let end = start
    for (const t of transactions) {
      if (t.date < start) start = t.date
      if (t.date > end) end = t.date
    }
    return { start, end }
  }, [transactions])

  const range = useMemo(() => resolveRange(preset, custom, bounds, thisMonth), [preset, custom, bounds, thisMonth])
  const months = useMemo(() => monthKeysBetween(toMonthKey(range.start), toMonthKey(range.end)), [range])

  const selectedAccount = accountId ? accountMap.get(accountId) ?? null : null
  const selectedCategory = categoryId ? categoryMap.get(categoryId) ?? null : null
  const currency = selectedAccount?.currency ?? fmt.defaultCurrency

  // Account + category filters combine; the range is applied by the domain helpers.
  const scoped = useMemo(
    () => transactions.filter((t) => (!accountId || t.accountId === accountId) && (!categoryId || t.categoryId === categoryId)),
    [transactions, accountId, categoryId],
  )

  const series = useMemo(() => monthlySeries(scoped.filter((t) => t.date >= range.start && t.date <= range.end), months), [scoped, months, range])
  const cashFlow = useMemo(() => computeCashFlow(scoped, range), [scoped, range])
  const spendingTotals = useMemo(() => totalsByCategory(scoped, categories, 'expense', range), [scoped, categories, range])
  const incomeTotals = useMemo(() => totalsByCategory(scoped, categories, 'income', range), [scoped, categories, range])

  const balanceAccount = useMemo(() => (accountId ? accounts.find((a) => a.id === accountId) ?? null : null), [accounts, accountId])
  const history = useMemo(() => {
    if (!balanceAccount || months.length === 0) return []
    const withLead = balanceHistory(balanceAccount, transactions, [shiftMonth(months[0]!, -1), ...months])
    return withLead.slice(1).map((point, i) => ({ ...point, change: point.balance - withLead[i]!.balance }))
  }, [balanceAccount, transactions, months])

  const table = useMemo<ReportTableData>(() => {
    const monthlyColumns = [
      { header: 'Month' },
      { header: 'Income', align: 'right' as const },
      { header: 'Expenses', align: 'right' as const },
      { header: 'Net', align: 'right' as const },
    ]
    const monthlyTotals: ReportCell[] = [
      { kind: 'text', value: 'Total' },
      { kind: 'money', amount: cashFlow.income, currency },
      { kind: 'money', amount: cashFlow.expenses, currency },
      { kind: 'money', amount: cashFlow.net, currency, signed: true },
    ]
    switch (type) {
      case 'income-expense':
        return {
          columns: monthlyColumns,
          rows: series.map((p) => ({
            key: p.month,
            cells: [
              { kind: 'month', month: p.month },
              { kind: 'money', amount: p.income, currency },
              { kind: 'money', amount: p.expenses, currency },
              { kind: 'money', amount: p.net, currency, signed: true },
            ],
          })),
          totals: monthlyTotals,
        }
      case 'cash-flow':
        return {
          columns: [...monthlyColumns, { header: 'Change', align: 'right' as const }],
          rows: series.map((p, i) => ({
            key: p.month,
            cells: [
              { kind: 'month', month: p.month },
              { kind: 'money', amount: p.income, currency },
              { kind: 'money', amount: p.expenses, currency },
              { kind: 'money', amount: p.net, currency, signed: true },
              { kind: 'percent', value: i === 0 ? null : percentChange(p.net, series[i - 1]!.net), signed: true },
            ],
          })),
          totals: [...monthlyTotals, { kind: 'text', value: '' }],
        }
      case 'spending-by-category':
        return categoryTable(spendingTotals, cashFlow.expenses, 'Spent')
      case 'income-by-category':
        return categoryTable(incomeTotals, cashFlow.income, 'Received')
      case 'balances': {
        const first = history[0]
        const last = history[history.length - 1]
        return {
          columns: [{ header: 'Month' }, { header: 'Balance', align: 'right' }, { header: 'Change', align: 'right' }],
          rows: history.map((h) => ({
            key: h.month,
            cells: [
              { kind: 'month', month: h.month },
              { kind: 'money', amount: h.balance, currency },
              { kind: 'money', amount: h.change, currency, signed: true },
            ],
          })),
          totals:
            first && last
              ? [
                  { kind: 'text', value: 'Change over period' },
                  { kind: 'text', value: '' },
                  { kind: 'money', amount: last.balance - (first.balance - first.change), currency, signed: true },
                ]
              : undefined,
        }
      }
    }
  }, [type, series, cashFlow, spendingTotals, incomeTotals, history, currency])

  const reportMeta = REPORT_TYPES.find((r) => r.value === type)!
  const needsAccount = type === 'balances' && !balanceAccount
  const resultCount =
    type === 'spending-by-category' ? spendingTotals.length : type === 'income-by-category' ? incomeTotals.length : type === 'balances' ? history.length : cashFlow.transactionCount
  const noResults = hasData && !needsAccount && resultCount === 0
  const canExport = hasData && !needsAccount && !noResults && table.rows.length > 0

  const headerActions = useMemo(() => {
    const onExport = () => {
      const { header, rows } = reportToCsvRows(table, currency)
      const fileName = reportFileName(type, range)
      downloadCsv(fileName, buildCsv(header, rows))
      toast.success('CSV exported', { description: fileName })
    }
    return (
      <Button variant="outline" onClick={onExport} disabled={!canExport}>
        <Download aria-hidden="true" />
        Export CSV
      </Button>
    )
  }, [table, currency, type, range, canExport])

  usePageHeader({
    title: 'Reports',
    description: 'Visual insight into income, spending and balances. Export any report as CSV.',
    actions: headerActions,
  })

  if (!hasData) {
    return (
      <PageContainer>
        <EmptyState
          icon={BarChart3}
          title="No transactions to report on"
          description="Reports are built from your posted transactions. Add some manually or import a CSV file to get started."
          action={
            <>
              <Button asChild>
                <Link to="/transactions/new">
                  <Plus aria-hidden="true" />
                  Add transaction
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/import">
                  <Upload aria-hidden="true" />
                  Import CSV
                </Link>
              </Button>
            </>
          }
        />
      </PageContainer>
    )
  }

  const periodText = `${fmt.date(range.start)} – ${fmt.date(range.end)}`
  const categoryFilterType = type === 'spending-by-category' ? 'expense' : type === 'income-by-category' ? 'income' : undefined
  const categoryDisabled = type === 'balances'

  const trendData = series.map((p) => ({ label: fmt.month(p.month, 'short'), value: p.net }))
  const balanceData = history.map((h) => ({ label: fmt.month(h.month, 'short'), value: h.balance }))

  return (
    <PageContainer width="wide">
      {/* Report type */}
      <div>
        <Tabs value={type} onValueChange={(v) => setType(v as ReportType)} className="hidden md:flex">
          <TabsList aria-label="Report type">
            {REPORT_TYPES.map((r) => (
              <TabsTrigger key={r.value} value={r.value} className="px-3">
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-1.5 md:hidden">
          <Label htmlFor="report-type" className="text-xs text-muted-foreground">
            Report
          </Label>
          <SelectInput<ReportType> id="report-type" value={type} onChange={setType} options={REPORT_TYPES} />
        </div>
      </div>

      {/* Filters */}
      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-period" className="text-xs text-muted-foreground">
                Period
              </Label>
              <SelectInput<PeriodPreset> id="report-period" value={preset} onChange={setPreset} options={PRESETS} className="w-44" />
            </div>
            {preset === 'custom' && <DateRangeFilter value={custom} onChange={setCustom} idPrefix="report-range" />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-account" className="text-xs text-muted-foreground">
                Account
              </Label>
              <AccountSelector id="report-account" value={accountId} onChange={setAccountId} allLabel="All accounts" includeArchived className="w-52" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-category" className="text-xs text-muted-foreground">
                Category
              </Label>
              <CategorySelector id="report-category" value={categoryId} onChange={setCategoryId} allLabel="All categories" type={categoryFilterType} disabled={categoryDisabled} className="w-52" />
            </div>
            {filtersActive && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <FilterX aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>

          {/* Active filter summary */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            <span>Showing:</span>
            <Badge variant="secondary" className="font-normal">
              {periodText}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {selectedAccount ? `Account: ${selectedAccount.name}` : 'All accounts'}
            </Badge>
            {categoryDisabled ? (
              <Badge variant="outline" className="font-normal">
                Category filter does not apply to balances
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-normal">
                {selectedCategory ? `Category: ${selectedCategory.name}` : 'All categories'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report */}
      <Card>
        <CardHeader>
          <CardTitle>{reportMeta.label}</CardTitle>
          <CardDescription>
            {reportMeta.description} {periodText}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {needsAccount ? (
            <EmptyState
              icon={Landmark}
              size="sm"
              title="Choose an account"
              description="Balance history is calculated per account. Pick one in the Account filter above to plot its end-of-month balance."
            />
          ) : noResults ? (
            <NoResultsState onClear={filtersActive ? clearFilters : undefined} />
          ) : (
            <>
              {type === 'income-expense' && <IncomeExpenseChart data={series} currency={currency} height={300} showNet />}
              {type === 'spending-by-category' && <CategoryBreakdownChart data={spendingTotals} currency={currency} variant="bars" height={280} maxSlices={10} />}
              {type === 'income-by-category' && <CategoryBreakdownChart data={incomeTotals} currency={currency} variant="bars" height={280} maxSlices={10} />}
              {type === 'cash-flow' && <TrendLineChart data={trendData} currency={currency} title="Net cash flow" height={300} />}
              {type === 'balances' && balanceAccount && (
                <TrendLineChart
                  data={balanceData}
                  currency={currency}
                  title={`${balanceAccount.name} balance`}
                  description={balanceAccount.type === 'credit' ? 'Credit account: the balance is the amount owed.' : undefined}
                  height={300}
                />
              )}
              <ReportTable data={table} caption={`${reportMeta.label}, ${periodText}`} />
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
