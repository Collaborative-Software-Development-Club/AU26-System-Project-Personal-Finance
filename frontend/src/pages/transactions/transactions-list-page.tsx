import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeftRight, ChevronLeft, ChevronRight, FilterX, Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { EmptyState, NoResultsState } from '@/components/feedback'
import {
  AccountSelector,
  CategorySelector,
  DateRangeFilter,
  SummaryCard,
  SummaryCardGrid,
  TransactionTable,
  sortTransactions,
  type TransactionSort,
} from '@/components/financial'
import { SearchInput, SelectInput, type SelectOption } from '@/components/forms'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { DEFAULT_PAGE_SIZE, TRANSACTION_TYPES, computeCashFlow, type Transaction, type TransactionType } from '@/domain'
import { useFormatters } from '@/hooks'
import { useAccountMap, useAccounts, useCategoryMap, useTransactions } from '@/store'
import { DeleteTransactionDialog } from './delete-transaction-dialog'

/** Query-string keys other pages deep-link with (see pages/AGENTS.md). */
const FILTER_KEYS = ['q', 'type', 'accountId', 'categoryId', 'start', 'end'] as const
type FilterKey = (typeof FILTER_KEYS)[number]
type Filters = Record<FilterKey, string>

const TYPE_OPTIONS: SelectOption[] = [{ value: '__all__', label: 'All types' }, ...TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label }))]

function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.some((t) => t.value === value)
}

export default function TransactionsListPage() {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const transactions = useTransactions()
  const accounts = useAccounts()
  const accountMap = useAccountMap()
  const categoryMap = useCategoryMap()
  const [searchParams, setSearchParams] = useSearchParams()

  // Filters live in the URL so the dashboard, accounts and budgets can deep-link here.
  const filters: Filters = {
    q: searchParams.get('q') ?? '',
    type: isTransactionType(searchParams.get('type') ?? '') ? (searchParams.get('type') as string) : '',
    accountId: searchParams.get('accountId') ?? '',
    categoryId: searchParams.get('categoryId') ?? '',
    start: searchParams.get('start') ?? '',
    end: searchParams.get('end') ?? '',
  }
  const activeFilterCount = FILTER_KEYS.filter((k) => filters[k] !== '').length

  const setFilters = (patch: Partial<Filters>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }
  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const key of FILTER_KEYS) next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const [sort, setSort] = useState<TransactionSort>({ key: 'date', direction: 'desc' })
  // Page resets whenever the filter/sort key changes (derived, not synced in an effect).
  const pageKey = `${searchParams.toString()}|${sort.key}|${sort.direction}`
  const [pageState, setPageState] = useState({ key: pageKey, page: 1 })
  const page = pageState.key === pageKey ? pageState.page : 1
  const setPage = (next: number) => setPageState({ key: pageKey, page: next })

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  usePageHeader({
    title: 'Transactions',
    description: 'Search, filter and manage every income, expense and transfer.',
    actions: (
      <>
        <Button asChild variant="outline">
          <Link to="/transfers/new">
            <ArrowLeftRight aria-hidden="true" />
            Transfer money
          </Link>
        </Button>
        <Button asChild>
          <Link to="/transactions/new">
            <Plus aria-hidden="true" />
            Add transaction
          </Link>
        </Button>
      </>
    ),
  })

  const filtered = useMemo(() => {
    const needle = filters.q.trim().toLowerCase()
    return transactions.filter((t) => {
      if (filters.type && t.type !== filters.type) return false
      if (filters.accountId && t.accountId !== filters.accountId) return false
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false
      if (filters.start && t.date < filters.start) return false
      if (filters.end && t.date > filters.end) return false
      if (needle && !t.description.toLowerCase().includes(needle) && !(t.notes ?? '').toLowerCase().includes(needle)) return false
      return true
    })
  }, [transactions, filters.q, filters.type, filters.accountId, filters.categoryId, filters.start, filters.end])

  const sorted = useMemo(() => sortTransactions(filtered, sort, accountMap, categoryMap), [filtered, sort, accountMap, categoryMap])
  const totals = useMemo(() => computeCashFlow(filtered), [filtered])

  const pageCount = Math.max(1, Math.ceil(sorted.length / DEFAULT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const rows = sorted.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE)
  const firstRow = sorted.length === 0 ? 0 : (safePage - 1) * DEFAULT_PAGE_SIZE + 1
  const lastRow = Math.min(safePage * DEFAULT_PAGE_SIZE, sorted.length)

  // Summary currency: the filtered account's currency when filtering by account, otherwise the default.
  const summaryCurrency = (filters.accountId ? accountMap.get(filters.accountId)?.currency : null) ?? fmt.defaultCurrency

  if (transactions.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description={
            accounts.length === 0
              ? 'Create an account first, then record your income and expenses here.'
              : 'Record your first income or expense to start tracking where your money goes.'
          }
          action={
            accounts.length === 0 ? (
              <Button asChild>
                <Link to="/accounts/new">
                  <Plus aria-hidden="true" />
                  Add account
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild>
                  <Link to="/transactions/new">
                    <Plus aria-hidden="true" />
                    Add transaction
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/import">Import CSV</Link>
                </Button>
              </>
            )
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer width="wide">
      <SummaryCardGrid columns={3}>
        <SummaryCard label="Income" amount={totals.income} currency={summaryCurrency} />
        <SummaryCard label="Expenses" amount={totals.expenses} currency={summaryCurrency} />
        <SummaryCard
          label="Net cash flow"
          amount={totals.net}
          currency={summaryCurrency}
          signed
          footer={
            <p className="text-xs text-muted-foreground">
              {totals.transactionCount} of {filtered.length} filtered rows counted · transfers excluded
            </p>
          }
        />
      </SummaryCardGrid>

      <section aria-label="Filters" className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-search" className="text-xs text-muted-foreground">
              Search
            </Label>
            <SearchInput id="tx-search" value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Description or notes…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-type" className="text-xs text-muted-foreground">
              Type
            </Label>
            <SelectInput id="tx-type" value={filters.type || '__all__'} onChange={(v) => setFilters({ type: v === '__all__' ? '' : v })} options={TYPE_OPTIONS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-account" className="text-xs text-muted-foreground">
              Account
            </Label>
            <AccountSelector id="tx-account" value={filters.accountId} onChange={(accountId) => setFilters({ accountId })} allLabel="All accounts" includeArchived />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-category" className="text-xs text-muted-foreground">
              Category
            </Label>
            <CategorySelector id="tx-category" value={filters.categoryId} onChange={(categoryId) => setFilters({ categoryId })} allLabel="All categories" />
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <DateRangeFilter idPrefix="tx-range" value={{ start: filters.start, end: filters.end }} onChange={(range) => setFilters({ start: range.start, end: range.end })} />
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {sorted.length === transactions.length ? `${transactions.length} transactions` : `${sorted.length} of ${transactions.length} transactions`}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <FilterX aria-hidden="true" />
                Clear filters ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>
      </section>

      <TransactionTable
        transactions={rows}
        accounts={accountMap}
        categories={categoryMap}
        sort={sort}
        onSortChange={setSort}
        onEdit={(tx) => navigate(`/transactions/${tx.id}/edit`)}
        onDelete={setDeleteTarget}
        emptyContent={<NoResultsState onClear={clearFilters} className="m-4" />}
      />

      {sorted.length > DEFAULT_PAGE_SIZE && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {firstRow}–{lastRow} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <span className="text-sm tabular text-muted-foreground" aria-current="page">
              Page {safePage} of {pageCount}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount}>
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}

      <DeleteTransactionDialog transaction={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </PageContainer>
  )
}
