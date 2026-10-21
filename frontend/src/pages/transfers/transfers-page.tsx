import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AlertTriangle, ArrowLeftRight, ArrowRight, Eye, Info, MoreHorizontal, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog, EmptyState, FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { AccountSelector, MoneyDisplay, TransferStatusBadge } from '@/components/financial'
import { DateInput, FormActions, FormField, FormGrid, MoneyInput } from '@/components/forms'
import { PageContainer, PageSection } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import {
  DESCRIPTION_MAX_LENGTH,
  TRANSFER_BLOCK_OVERDRAFT,
  balanceDelta,
  hasErrors,
  isLiabilityAccountType,
  parseMoney,
  todayISO,
  validateTransfer,
  type AccountWithBalance,
  type FieldErrors,
  type Id,
  type MinorUnits,
  type Transaction,
  type Transfer,
  type TransferDirection,
  type TransferFormValues,
} from '@/domain'
import type { TransferInput } from '@/api'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccountMap, useAccounts, useAccountsWithBalance, useFinanceStore, useIsPending, useTransactions } from '@/store'

export default function TransfersPage() {
  const [searchParams] = useSearchParams()
  const accountsWithBalance = useAccountsWithBalance()
  const activeAccounts = useMemo(() => accountsWithBalance.filter((a) => a.status === 'active'), [accountsWithBalance])

  usePageHeader({
    title: 'Transfers',
    description: 'Move money between your own accounts. Transfers change balances but never count as income or expenses.',
  })

  const requestedSource = searchParams.get('sourceAccountId') ?? ''
  const initialSource = activeAccounts.some((a) => a.id === requestedSource) ? requestedSource : ''

  return (
    <PageContainer>
      {activeAccounts.length < 2 ? (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>Two active accounts are needed</AlertTitle>
          <AlertDescription>
            <p>A transfer moves money from one of your accounts to another. You currently have {activeAccounts.length === 0 ? 'no active accounts' : 'only one active account'}.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/accounts/new">Add an account</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <TransferForm key={initialSource} initialSourceAccountId={initialSource} accounts={activeAccounts} />
      )}
      <TransferHistory />
    </PageContainer>
  )
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

/** A synthetic leg so the preview reuses the domain's balance rule (credit = amount owed). */
function previewLeg(direction: TransferDirection, amount: MinorUnits, account: AccountWithBalance): Transaction {
  return {
    id: 'preview',
    description: '',
    type: 'transfer',
    amount,
    currency: account.currency,
    accountId: account.id,
    categoryId: null,
    date: '',
    notes: null,
    source: 'transfer',
    status: 'posted',
    transferId: null,
    transferDirection: direction,
    recurringRuleId: null,
    importId: null,
    createdAt: '',
  }
}

function TransferForm({ initialSourceAccountId, accounts }: { initialSourceAccountId: Id | ''; accounts: AccountWithBalance[] }) {
  const fmt = useFormatters()
  const allAccounts = useAccounts()
  const createTransfer = useFinanceStore((s) => s.createTransfer)
  const reconcile = useFinanceStore((s) => s.reconcile)

  const [values, setValues] = useState<TransferFormValues>(() => ({
    sourceAccountId: initialSourceAccountId,
    destinationAccountId: '',
    amount: '',
    date: todayISO(),
    description: '',
  }))
  const [errors, setErrors] = useState<FieldErrors<keyof TransferFormValues>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const save = useAsyncAction(async (input: TransferInput, summary: string) => createTransfer(input, summary))
  const checking = useIsPending(`reconcile:${save.idempotencyKey ?? ''}`)

  const update = <K extends keyof TransferFormValues>(key: K, value: TransferFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const source = accounts.find((a) => a.id === values.sourceAccountId) ?? null
  const destination = accounts.find((a) => a.id === values.destinationAccountId) ?? null
  const currency = source?.currency ?? fmt.defaultCurrency
  const amount = parseMoney(values.amount, currency)
  const validAmount = amount !== null && amount > 0

  const sourceAfter = source && validAmount ? source.balance + balanceDelta(previewLeg('out', amount, source), source) : null
  const destinationAfter = destination && validAmount ? destination.balance + balanceDelta(previewLeg('in', amount, destination), destination) : null
  const wouldOverdraw = !!source && !isLiabilityAccountType(source.type) && sourceAfter !== null && sourceAfter < 0

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validateTransfer(values, { accounts: allAccounts })
    setErrors(errs)
    if (hasErrors(errs)) return
    save.reset()
    setConfirmOpen(true)
  }

  const confirm = async () => {
    if (!source || !destination || amount === null) return
    const input: TransferInput = {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount,
      date: values.date,
      description: values.description.trim() || null,
    }
    const summary = `Transfer ${fmt.money(amount, currency)} ${source.name} → ${destination.name}`
    const result = await save.run(input, summary)
    setConfirmOpen(false)
    if (!result) return
    toast.success('Transfer recorded', { description: summary })
    setValues((v) => ({ ...v, destinationAccountId: '', amount: '', description: '' }))
    setErrors({})
  }

  const checkStatus = async () => {
    if (!save.idempotencyKey) return
    try {
      const outcome = await reconcile(save.idempotencyKey)
      if (outcome === 'committed') {
        toast.success('Transfer was recorded', { description: 'The server confirmed it completed; it now appears in the history below.' })
        setValues((v) => ({ ...v, destinationAccountId: '', amount: '', description: '' }))
        save.reset()
      } else {
        toast.info('Transfer was not recorded', { description: 'The server has no record of it. You can submit it again.' })
        save.reset()
      }
    } catch (err) {
      toast.error('Could not check status', { description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-transfer" aria-hidden="true" />
          New transfer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormGrid>
            <FormField
              label="From account"
              required
              error={errors.sourceAccountId ?? save.fieldErrors.sourceAccountId}
              description={source ? `${isLiabilityAccountType(source.type) ? 'Amount owed' : 'Balance'} ${fmt.money(source.balance, source.currency)}` : undefined}
            >
              <AccountSelector value={values.sourceAccountId} onChange={(v) => update('sourceAccountId', v)} excludeId={values.destinationAccountId || null} placeholder="Select source" />
            </FormField>
            <FormField
              label="To account"
              required
              error={errors.destinationAccountId ?? save.fieldErrors.destinationAccountId}
              description={destination ? `${isLiabilityAccountType(destination.type) ? 'Amount owed' : 'Balance'} ${fmt.money(destination.balance, destination.currency)}` : undefined}
            >
              <AccountSelector value={values.destinationAccountId} onChange={(v) => update('destinationAccountId', v)} excludeId={values.sourceAccountId || null} placeholder="Select destination" />
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField label="Amount" required error={errors.amount ?? save.fieldErrors.amount} description={source ? `In ${currency}, the source account's currency.` : undefined}>
              <MoneyInput value={values.amount} onChange={(v) => update('amount', v)} currency={currency} />
            </FormField>
            <FormField label="Date" required error={errors.date ?? save.fieldErrors.date}>
              <DateInput value={values.date} onChange={(v) => update('date', v)} />
            </FormField>
          </FormGrid>

          <FormField label="Memo" hintLabel="(optional)" error={errors.description ?? save.fieldErrors.description} description="Shown on both legs of the transfer.">
            <Input value={values.description} onChange={(e) => update('description', e.target.value)} maxLength={DESCRIPTION_MAX_LENGTH} placeholder="e.g. Monthly savings" />
          </FormField>

          {source && destination && validAmount && (
            <BalancePreview source={source} destination={destination} sourceAfter={sourceAfter} destinationAfter={destinationAfter} wouldOverdraw={wouldOverdraw} />
          )}

          {save.status === 'error' && <FormErrorMessage message={save.error} />}
          {save.status === 'unknown' && (
            <OutcomeUnknownNotice
              title="Transfer outcome unknown"
              description="The request was sent but no confirmation came back. The transfer may or may not have been recorded — do not submit it again until you have checked. The banner at the top of the page also tracks it until it is resolved."
              onCheckStatus={() => void checkStatus()}
              checking={checking}
            />
          )}

          <FormActions submitLabel="Review transfer" pending={save.isPending} pendingLabel="Transferring…" disabled={save.status === 'unknown'} />
        </form>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm transfer"
        description="Check the details before recording this transfer. Both account balances will change together."
        confirmLabel="Confirm transfer"
        pending={save.isPending}
        onConfirm={() => void confirm()}
      >
        {source && destination && amount !== null && (
          <div className="flex flex-col gap-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">From</dt>
              <dd className="font-medium">{source.name}</dd>
              <dt className="text-muted-foreground">To</dt>
              <dd className="font-medium">{destination.name}</dd>
              <dt className="text-muted-foreground">Amount</dt>
              <dd>
                <MoneyDisplay amount={amount} currency={currency} className="font-semibold" />
              </dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd>{fmt.date(values.date)}</dd>
              {values.description.trim() && (
                <>
                  <dt className="text-muted-foreground">Memo</dt>
                  <dd>{values.description.trim()}</dd>
                </>
              )}
            </dl>
            <BalancePreview source={source} destination={destination} sourceAfter={sourceAfter} destinationAfter={destinationAfter} wouldOverdraw={wouldOverdraw} />
          </div>
        )}
      </ConfirmDialog>
    </Card>
  )
}

function BalancePreview({
  source,
  destination,
  sourceAfter,
  destinationAfter,
  wouldOverdraw,
}: {
  source: AccountWithBalance
  destination: AccountWithBalance
  sourceAfter: MinorUnits | null
  destinationAfter: MinorUnits | null
  wouldOverdraw: boolean
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Resulting balances</p>
      <PreviewRow account={source} after={sourceAfter} />
      <PreviewRow account={destination} after={destinationAfter} />
      {wouldOverdraw && TRANSFER_BLOCK_OVERDRAFT && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          This would overdraw {source.name}. Transfers that take a non-credit account below zero are rejected.
        </p>
      )}
    </div>
  )
}

function PreviewRow({ account, after }: { account: AccountWithBalance; after: MinorUnits | null }) {
  const liability = isLiabilityAccountType(account.type)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="min-w-0 truncate">
        {account.name}
        <span className="ml-1 text-xs text-muted-foreground">{liability ? '(amount owed)' : ''}</span>
      </span>
      <span className="flex items-center gap-1.5 tabular">
        <MoneyDisplay amount={account.balance} currency={account.currency} size="sm" className="text-muted-foreground" />
        <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
        {after !== null ? <MoneyDisplay amount={after} currency={account.currency} size="sm" className="font-medium" /> : <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function TransferHistory() {
  const fmt = useFormatters()
  const transfers = useFinanceStore((s) => s.transfers)
  const transactions = useTransactions()
  const accounts = useAccountMap()
  const deleteTransfer = useFinanceStore((s) => s.deleteTransfer)
  const [deleteTarget, setDeleteTarget] = useState<Transfer | null>(null)

  const remove = useAsyncAction(async (id: Id) => deleteTransfer(id))

  const sorted = useMemo(
    () => [...transfers].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
    [transfers],
  )
  const legs = useMemo(() => {
    const map = new Map<Id, { out: Transaction | null; in: Transaction | null }>()
    for (const t of transactions) {
      if (t.type !== 'transfer' || !t.transferId) continue
      const entry = map.get(t.transferId) ?? { out: null, in: null }
      if (t.transferDirection === 'out') entry.out = t
      else entry.in = t
      map.set(t.transferId, entry)
    }
    return map
  }, [transactions])

  const closeDelete = () => {
    remove.reset()
    setDeleteTarget(null)
  }
  const confirmDelete = async () => {
    if (!deleteTarget) return
    const ok = await remove.run(deleteTarget.id)
    if (ok === undefined) return
    toast.success('Transfer deleted', { description: 'Both legs were removed.' })
    closeDelete()
  }

  const deleteSource = deleteTarget ? accounts.get(deleteTarget.sourceAccountId)?.name ?? 'Unknown account' : ''
  const deleteDestination = deleteTarget ? accounts.get(deleteTarget.destinationAccountId)?.name ?? 'Unknown account' : ''

  return (
    <PageSection title="Transfer history" description={sorted.length > 0 ? `${sorted.length} transfer${sorted.length === 1 ? '' : 's'}, newest first.` : undefined}>
      {sorted.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} size="sm" title="No transfers yet" description="Transfers you record appear here with links to both legs." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28">Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell">Memo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((transfer) => {
                const pair = legs.get(transfer.id)
                const sourceName = accounts.get(transfer.sourceAccountId)?.name ?? 'Unknown account'
                const destinationName = accounts.get(transfer.destinationAccountId)?.name ?? 'Unknown account'
                return (
                  <TableRow key={transfer.id}>
                    <TableCell className="tabular whitespace-nowrap text-muted-foreground">{fmt.date(transfer.date)}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">{sourceName}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">{destinationName}</TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay amount={transfer.amount} currency={transfer.currency} size="sm" className="font-medium text-transfer" />
                    </TableCell>
                    <TableCell className="hidden max-w-[220px] truncate text-muted-foreground md:table-cell">{transfer.description ?? '—'}</TableCell>
                    <TableCell>
                      <TransferStatusBadge status={transfer.status} />
                    </TableCell>
                    <TableCell className="p-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for transfer from ${sourceName} to ${destinationName} on ${fmt.date(transfer.date)}`}>
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {pair?.out && (
                            <DropdownMenuItem asChild>
                              <Link to={`/transactions/${pair.out.id}`}>
                                <Eye aria-hidden="true" /> View outgoing leg
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {pair?.in && (
                            <DropdownMenuItem asChild>
                              <Link to={`/transactions/${pair.in.id}`}>
                                <Eye aria-hidden="true" /> View incoming leg
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {!pair?.out && !pair?.in && <DropdownMenuItem disabled>No legs found</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(transfer)}>
                            <Trash2 aria-hidden="true" /> Delete transfer…
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => (!open ? closeDelete() : undefined)}
        title="Delete transfer?"
        description="This removes the transfer and both of its legs, restoring the two account balances. It cannot be undone."
        confirmLabel="Delete transfer"
        destructive
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      >
        {deleteTarget && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium">{deleteSource}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{deleteDestination}</span>
              <MoneyDisplay amount={deleteTarget.amount} currency={deleteTarget.currency} size="sm" className="ml-auto font-medium" />
              <span className="w-full text-xs text-muted-foreground">{fmt.date(deleteTarget.date)}</span>
            </div>
            {remove.status === 'error' && <FormErrorMessage message={remove.error} />}
          </div>
        )}
      </ConfirmDialog>
    </PageSection>
  )
}
