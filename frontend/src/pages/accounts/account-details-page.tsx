import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Archive, ArchiveRestore, ArrowLeftRight, ChevronLeft, ChevronRight, ExternalLink, FilterX, Loader2, MoreHorizontal, Pencil, Plus, Receipt } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { EmptyState, NoResultsState, toast } from '@/components/feedback'
import {
  ACCOUNT_TYPE_ICON,
  AccountStatusBadge,
  AccountTypeBadge,
  DateRangeFilter,
  MoneyDisplay,
  TransactionTable,
  TrendLineChart,
  sortTransactions,
  type TransactionSort,
} from '@/components/financial'
import { SearchInput, SelectInput, type SelectOption } from '@/components/forms'
import { PageContainer, PageSection } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import {
  DEFAULT_PAGE_SIZE,
  TRANSACTION_TYPES,
  balanceHistory,
  isLiabilityAccountType,
  lastMonthKeys,
  type AccountStatus,
  type AccountWithBalance,
  type Transaction,
  type TransactionType,
} from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccountMap, useAccountWithBalance, useCategoryMap, useFinanceStore, useTransactions } from '@/store'
import { EntityNotFound } from '@/pages/errors/entity-not-found'
import { DeleteTransactionDialog } from '@/pages/transactions/delete-transaction-dialog'

const ALL = '__all__'
const TYPE_OPTIONS: SelectOption[] = [{ value: ALL, label: 'All types' }, ...TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label }))]
const HISTORY_MONTHS = 6

export default function AccountDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const account = useAccountWithBalance(id)
  if (!account) return <EntityNotFound entity="Account" backTo="/accounts" backLabel="Back to accounts" />
  return <AccountDetails key={account.id} account={account} />
}

function AccountDetails({ account }: { account: AccountWithBalance }) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const transactions = useTransactions()
  const accountMap = useAccountMap()
  const categoryMap = useCategoryMap()
  const setAccountStatus = useFinanceStore((s) => s.setAccountStatus)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('')
  const [range, setRange] = useState({ start: '', end: '' })
  const [sort, setSort] = useState<TransactionSort>({ key: 'date', direction: 'desc' })
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  const pageKey = `${search}|${typeFilter}|${range.start}|${range.end}|${sort.key}|${sort.direction}`
  const [pageState, setPageState] = useState({ key: pageKey, page: 1 })
  const page = pageState.key === pageKey ? pageState.page : 1
  const setPage = (next: number) => setPageState({ key: pageKey, page: next })

  const archived = account.status === 'archived'
  const liability = isLiabilityAccountType(account.type)
  const Icon = ACCOUNT_TYPE_ICON[account.type]

  const toggle = useAsyncAction(async (status: AccountStatus) => {
    try {
      return await setAccountStatus(account.id, status)
    } catch (e) {
      toast.error(status === 'archived' ? 'Could not archive account' : 'Could not restore account', { description: e instanceof Error ? e.message : undefined })
      throw e
    }
  })
  const toggleStatus = async () => {
    const next: AccountStatus = archived ? 'active' : 'archived'
    const result = await toggle.run(next)
    if (result) toast.success(next === 'archived' ? 'Account archived' : 'Account restored', { description: result.name })
  }

  usePageHeader({
    title: account.name,
    breadcrumbs: [{ label: 'Accounts', to: '/accounts' }],
    actions: (
      <>
        <Button asChild variant="outline">
          <Link to={`/accounts/${account.id}/edit`}>
            <Pencil aria-hidden="true" />
            Edit
          </Link>
        </Button>
        {archived ? (
          <Button variant="outline" onClick={() => void toggleStatus()} disabled={toggle.isPending}>
            {toggle.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArchiveRestore aria-hidden="true" />}
            Unarchive
          </Button>
        ) : (
          <>
            <Button asChild variant="outline">
              <Link to={`/transfers/new?sourceAccountId=${account.id}`}>
                <ArrowLeftRight aria-hidden="true" />
                Transfer
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/transactions/new?accountId=${account.id}`}>
                <Plus aria-hidden="true" />
                Add transaction
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions" disabled={toggle.isPending}>
                  {toggle.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void toggleStatus()}>
                  <Archive aria-hidden="true" /> Archive account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </>
    ),
  })

  const own = useMemo(() => transactions.filter((t) => t.accountId === account.id), [transactions, account.id])
  const history = useMemo(() => {
    const months = lastMonthKeys(HISTORY_MONTHS)
    return balanceHistory(account, transactions, months).map((p) => ({ label: fmt.month(p.month, 'short'), value: p.balance }))
  }, [account, transactions, fmt])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return own.filter((t) => {
      if (typeFilter && t.type !== typeFilter) return false
      if (range.start && t.date < range.start) return false
      if (range.end && t.date > range.end) return false
      if (needle && !t.description.toLowerCase().includes(needle) && !(t.notes ?? '').toLowerCase().includes(needle)) return false
      return true
    })
  }, [own, search, typeFilter, range.start, range.end])
  const sorted = useMemo(() => sortTransactions(filtered, sort, accountMap, categoryMap), [filtered, sort, accountMap, categoryMap])

  const pageCount = Math.max(1, Math.ceil(sorted.length / DEFAULT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const rows = sorted.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE)
  const filtersActive = search !== '' || typeFilter !== '' || range.start !== '' || range.end !== ''
  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setRange({ start: '', end: '' })
  }

  return (
    <PageContainer>
      {archived && (
        <Alert>
          <Archive aria-hidden="true" />
          <AlertTitle>This account is archived</AlertTitle>
          <AlertDescription>
            <p>It is hidden from account pickers and excluded from net worth, but its history is kept. Unarchive it to record new activity.</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="flex h-full flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${account.color ?? '#64748b'}1f`, color: account.color ?? undefined }}>
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <AccountTypeBadge type={account.type} />
                  <AccountStatusBadge status={account.status} />
                </div>
                {account.description && <p className="mt-2 text-sm text-muted-foreground">{account.description}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{liability ? 'Amount owed' : 'Current balance'}</p>
              <MoneyDisplay amount={account.balance} currency={account.currency} size="xl" className={liability && account.balance > 0 ? 'text-expense' : undefined} />
              {liability && <p className="mt-1 text-xs text-muted-foreground">Counted as a liability in net worth.</p>}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Currency</dt>
                <dd className="font-medium">{account.currency}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Opening balance</dt>
                <dd>
                  <MoneyDisplay amount={account.openingBalance} currency={account.currency} size="sm" className="font-medium" />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Transactions</dt>
                <dd className="font-medium tabular">{fmt.number(account.transactionCount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="font-medium">{fmt.dateTime(account.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent>
            <TrendLineChart
              data={history}
              currency={account.currency}
              title={liability ? 'Amount owed over time' : 'Balance over time'}
              description={`End-of-month ${liability ? 'amount owed' : 'balance'} for the last ${HISTORY_MONTHS} months, derived from posted transactions.`}
              height={220}
            />
          </CardContent>
        </Card>
      </div>

      <PageSection
        title="Activity"
        description="Transactions recorded in this account. Transfer rows show whether this account sent or received the money."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to={`/transactions?accountId=${account.id}`}>
              Open in Transactions
              <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        {own.length === 0 ? (
          <EmptyState
            icon={Receipt}
            size="sm"
            title="No transactions in this account"
            description={archived ? 'Archived accounts cannot receive new transactions.' : 'Record the first income, expense or transfer for this account.'}
            action={
              !archived && (
                <>
                  <Button asChild size="sm">
                    <Link to={`/transactions/new?accountId=${account.id}`}>
                      <Plus aria-hidden="true" />
                      Add transaction
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/transfers/new?sourceAccountId=${account.id}`}>
                      <ArrowLeftRight aria-hidden="true" />
                      Transfer
                    </Link>
                  </Button>
                </>
              )
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
              <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                <Label htmlFor="account-tx-search" className="text-xs text-muted-foreground">
                  Search
                </Label>
                <SearchInput id="account-tx-search" value={search} onChange={setSearch} placeholder="Description or notes…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="account-tx-type" className="text-xs text-muted-foreground">
                  Type
                </Label>
                <SelectInput id="account-tx-type" value={typeFilter || ALL} onChange={(v) => setTypeFilter(v === ALL ? '' : (v as TransactionType))} options={TYPE_OPTIONS} className="w-40" />
              </div>
              <DateRangeFilter idPrefix="account-tx-range" value={range} onChange={setRange} />
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <FilterX aria-hidden="true" />
                  Clear filters
                </Button>
              )}
            </div>

            <TransactionTable
              transactions={rows}
              accounts={accountMap}
              categories={categoryMap}
              hideAccount
              sort={sort}
              onSortChange={setSort}
              onEdit={(tx) => navigate(`/transactions/${tx.id}/edit`)}
              onDelete={setDeleteTarget}
              emptyContent={<NoResultsState onClear={clearFilters} className="m-4" />}
            />

            {sorted.length > DEFAULT_PAGE_SIZE && (
              <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(safePage - 1) * DEFAULT_PAGE_SIZE + 1}–{Math.min(safePage * DEFAULT_PAGE_SIZE, sorted.length)} of {sorted.length}
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
          </>
        )}
      </PageSection>

      <DeleteTransactionDialog transaction={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </PageContainer>
  )
}
