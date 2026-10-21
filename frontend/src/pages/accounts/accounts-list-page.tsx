import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Archive, ArchiveRestore, Landmark, Loader2, MoreHorizontal, Pencil, Plus, Scale, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog, EmptyState, FormErrorMessage, NoResultsState, toast } from '@/components/feedback'
import { BalanceCard, SummaryCard, SummaryCardGrid } from '@/components/financial'
import { SelectInput, type SelectOption } from '@/components/forms'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { ACCOUNT_TYPES, type AccountStatus, type AccountType, type AccountWithBalance, type Id } from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccountsWithBalance, useFinanceStore, useNetWorth } from '@/store'

type SortKey = 'name' | 'balance'
const ALL = '__all__'
const TYPE_OPTIONS: SelectOption[] = [{ value: ALL, label: 'All types' }, ...ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))]
const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'balance', label: 'Balance (high to low)' },
]

export default function AccountsListPage() {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const accounts = useAccountsWithBalance()
  const netWorth = useNetWorth()
  const deleteAccount = useFinanceStore((s) => s.deleteAccount)
  const setAccountStatus = useFinanceStore((s) => s.setAccountStatus)

  const [showArchived, setShowArchived] = useState(false)
  const [typeFilter, setTypeFilter] = useState<AccountType | ''>('')
  const [sort, setSort] = useState<SortKey>('name')
  const [deleteTarget, setDeleteTarget] = useState<AccountWithBalance | null>(null)

  const remove = useAsyncAction(async (id: Id) => deleteAccount(id))
  const archiveInstead = useAsyncAction(async (id: Id) => setAccountStatus(id, 'archived'))

  usePageHeader({
    title: 'Accounts',
    description: 'Manage your financial accounts.',
    actions: (
      <Button asChild>
        <Link to="/accounts/new">
          <Plus aria-hidden="true" />
          Add account
        </Link>
      </Button>
    ),
  })

  const archivedCount = accounts.filter((a) => a.status === 'archived').length
  const visible = useMemo(() => {
    const list = accounts.filter((a) => (showArchived || a.status === 'active') && (!typeFilter || a.type === typeFilter))
    return list.sort((a, b) => {
      // Active accounts first, then the chosen sort, then name for determinism.
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      if (sort === 'balance' && a.balance !== b.balance) return b.balance - a.balance
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
    })
  }, [accounts, showArchived, typeFilter, sort])

  const closeDelete = () => {
    remove.reset()
    archiveInstead.reset()
    setDeleteTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const name = deleteTarget.name
    const ok = await remove.run(deleteTarget.id)
    if (ok === undefined) return
    toast.success('Account deleted', { description: name })
    closeDelete()
  }

  const confirmArchiveInstead = async () => {
    if (!deleteTarget) return
    const result = await archiveInstead.run(deleteTarget.id)
    if (!result) return
    toast.success('Account archived', { description: `${result.name} is hidden from pickers and net worth but keeps its history.` })
    closeDelete()
  }

  if (accounts.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          description="Create your first account to start tracking your finances."
          action={
            <Button asChild>
              <Link to="/accounts/new">
                <Plus aria-hidden="true" />
                Add account
              </Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const filtersActive = typeFilter !== '' || showArchived

  return (
    <PageContainer>
      <SummaryCardGrid columns={3}>
        <SummaryCard label="Total assets" amount={netWorth.assets} currency={fmt.defaultCurrency} icon={TrendingUp} />
        <SummaryCard label="Total liabilities" amount={netWorth.liabilities} currency={fmt.defaultCurrency} icon={TrendingDown} footer={<p className="text-xs text-muted-foreground">Amount owed on credit accounts</p>} />
        <SummaryCard
          label="Net worth"
          amount={netWorth.netWorth}
          currency={fmt.defaultCurrency}
          signed
          icon={Scale}
          footer={
            <p className="text-xs text-muted-foreground">
              Assets − liabilities across {netWorth.accountCount} active account{netWorth.accountCount === 1 ? '' : 's'}
            </p>
          }
        />
      </SummaryCardGrid>

      <section aria-label="Account filters" className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-type-filter" className="text-xs text-muted-foreground">
              Type
            </Label>
            <SelectInput id="account-type-filter" value={typeFilter || ALL} onChange={(v) => setTypeFilter(v === ALL ? '' : (v as AccountType))} options={TYPE_OPTIONS} className="w-44" size="sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-sort" className="text-xs text-muted-foreground">
              Sort by
            </Label>
            <SelectInput<SortKey> id="account-sort" value={sort} onChange={setSort} options={SORT_OPTIONS} className="w-48" size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived" className="text-sm">
            Show archived ({archivedCount})
          </Label>
        </div>
      </section>

      {visible.length === 0 ? (
        <NoResultsState
          onClear={() => {
            setTypeFilter('')
            setShowArchived(false)
          }}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Accounts">
          {visible.map((account) => (
            <li key={account.id}>
              <BalanceCard account={account} actions={<AccountCardActions account={account} onEdit={() => navigate(`/accounts/${account.id}/edit`)} onDelete={() => setDeleteTarget(account)} />} />
            </li>
          ))}
        </ul>
      )}
      {filtersActive && visible.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {visible.length} of {accounts.length} accounts.
        </p>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => (!open ? closeDelete() : undefined)}
        title="Delete account?"
        description={
          deleteTarget
            ? deleteTarget.transactionCount > 0
              ? `"${deleteTarget.name}" has ${deleteTarget.transactionCount} transaction${deleteTarget.transactionCount === 1 ? '' : 's'}. Accounts with transactions cannot be deleted — archiving keeps the history while hiding the account.`
              : `"${deleteTarget.name}" has no transactions and will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete account"
        destructive
        pending={remove.isPending || archiveInstead.isPending}
        onConfirm={() => void confirmDelete()}
      >
        {deleteTarget && (
          <div className="flex flex-col gap-3">
            {remove.status === 'error' && <FormErrorMessage message={remove.error} />}
            {archiveInstead.status === 'error' && <FormErrorMessage message={archiveInstead.error} />}
            {deleteTarget.status === 'active' && (deleteTarget.transactionCount > 0 || remove.status === 'error') && (
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => void confirmArchiveInstead()} disabled={archiveInstead.isPending || remove.isPending}>
                  {archiveInstead.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Archive aria-hidden="true" />}
                  Archive instead
                </Button>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </PageContainer>
  )
}

/** Per-card actions menu: edit, archive/unarchive, delete. */
function AccountCardActions({ account, onEdit, onDelete }: { account: AccountWithBalance; onEdit(): void; onDelete(): void }) {
  const setAccountStatus = useFinanceStore((s) => s.setAccountStatus)
  const toggle = useAsyncAction(async (status: AccountStatus) => {
    try {
      return await setAccountStatus(account.id, status)
    } catch (e) {
      toast.error(status === 'archived' ? 'Could not archive account' : 'Could not restore account', { description: e instanceof Error ? e.message : undefined })
      throw e
    }
  })
  const archived = account.status === 'archived'

  const toggleStatus = async () => {
    const next: AccountStatus = archived ? 'active' : 'archived'
    const result = await toggle.run(next)
    if (result) toast.success(next === 'archived' ? 'Account archived' : 'Account restored', { description: result.name })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.name}`} disabled={toggle.isPending}>
          {toggle.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void toggleStatus()}>
          {archived ? (
            <>
              <ArchiveRestore aria-hidden="true" /> Unarchive
            </>
          ) : (
            <>
              <Archive aria-hidden="true" /> Archive
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden="true" /> Delete…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
