import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowLeftRight, ArrowRight, CheckCircle2, Clock, Copy, Info, Pencil, Trash2, XCircle, type LucideIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryChip, MoneyDisplay, SourceBadge, TransactionTypeBadge, TransferStatusBadge } from '@/components/financial'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import type { Transaction, TransactionStatus } from '@/domain'
import { useFormatters } from '@/hooks'
import { useAccountMap, useCategoryMap, useFinanceStore, useTransaction, useTransactions } from '@/store'
import { EntityNotFound } from '@/pages/errors/entity-not-found'
import { DeleteTransactionDialog } from './delete-transaction-dialog'
import { duplicateTransactionUrl } from './transaction-links'

export default function TransactionDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const transaction = useTransaction(id)
  if (!transaction) return <EntityNotFound entity="Transaction" backTo="/transactions" backLabel="Back to transactions" />
  return <TransactionDetails key={transaction.id} transaction={transaction} />
}

const STATUS_META: Record<TransactionStatus, { label: string; icon: LucideIcon; className: string }> = {
  posted: { label: 'Posted', icon: CheckCircle2, className: 'text-success' },
  pending: { label: 'Pending', icon: Clock, className: 'text-warning' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-expense' },
}

function TransactionDetails({ transaction: tx }: { transaction: Transaction }) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const accounts = useAccountMap()
  const categories = useCategoryMap()
  const transactions = useTransactions()
  const transfer = useFinanceStore((s) => (tx.transferId ? s.transfers.find((t) => t.id === tx.transferId) ?? null : null))
  const [deleting, setDeleting] = useState(false)

  const isTransfer = tx.type === 'transfer'
  const account = accounts.get(tx.accountId) ?? null
  const category = tx.categoryId ? categories.get(tx.categoryId) ?? null : null
  const counterpart = isTransfer ? transactions.find((t) => t.transferId === tx.transferId && t.id !== tx.id) ?? null : null
  const outLeg = tx.transferDirection === 'out' ? tx : counterpart
  const inLeg = tx.transferDirection === 'in' ? tx : counterpart
  const sourceAccount = outLeg ? accounts.get(outLeg.accountId) ?? null : null
  const destinationAccount = inLeg ? accounts.get(inLeg.accountId) ?? null : null
  const status = STATUS_META[tx.status]
  const StatusIcon = status.icon

  usePageHeader({
    title: tx.description,
    breadcrumbs: [{ label: 'Transactions', to: '/transactions' }],
    actions: (
      <>
        {!isTransfer && (
          <Button asChild variant="outline">
            <Link to={duplicateTransactionUrl(tx)}>
              <Copy aria-hidden="true" />
              Duplicate
            </Link>
          </Button>
        )}
        {isTransfer ? (
          <Button variant="outline" disabled aria-disabled="true" title="Transfer legs cannot be edited individually">
            <Pencil aria-hidden="true" />
            Edit
          </Button>
        ) : (
          <Button asChild>
            <Link to={`/transactions/${tx.id}/edit`}>
              <Pencil aria-hidden="true" />
              Edit
            </Link>
          </Button>
        )}
        <Button variant="destructive" onClick={() => setDeleting(true)}>
          <Trash2 aria-hidden="true" />
          {isTransfer ? 'Delete transfer' : 'Delete'}
        </Button>
      </>
    ),
  })

  return (
    <PageContainer width="narrow">
      {isTransfer && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>This is one leg of a transfer</AlertTitle>
          <AlertDescription>
            <p>
              Transfer legs cannot be edited individually because both accounts must stay consistent. To change it, delete the transfer and record it again from the{' '}
              <Link to="/transfers">Transfers page</Link>.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Amount</p>
              <MoneyDisplay amount={tx.amount} currency={tx.currency} variant="type" type={tx.type} transferDirection={tx.transferDirection} size="xl" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TransactionTypeBadge type={tx.type} direction={tx.transferDirection} />
              <SourceBadge source={tx.source} />
            </div>
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Date">{fmt.date(tx.date)}</Field>
            <Field label="Status">
              <span className={`inline-flex items-center gap-1.5 ${status.className}`}>
                <StatusIcon className="size-4" aria-hidden="true" />
                {status.label}
              </span>
            </Field>
            <Field label="Account">
              {account ? (
                <Link to={`/accounts/${account.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {account.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">Unknown account</span>
              )}
            </Field>
            <Field label="Category">{isTransfer ? <span className="text-muted-foreground">Not applicable to transfers</span> : <CategoryChip category={category} />}</Field>
            <Field label="Currency">{tx.currency}</Field>
            <Field label="Created">{fmt.dateTime(tx.createdAt)}</Field>
            <Field label="Notes" className="sm:col-span-2">
              {tx.notes ? <p className="whitespace-pre-wrap">{tx.notes}</p> : <span className="text-muted-foreground">No notes</span>}
            </Field>
            {tx.recurringRuleId && (
              <Field label="Recurring rule">
                <Link to="/recurring" className="text-primary underline-offset-4 hover:underline">
                  Created by a recurring rule
                </Link>
              </Field>
            )}
            {tx.importId && (
              <Field label="Import">
                <Link to="/import/history" className="text-primary underline-offset-4 hover:underline">
                  Imported from CSV
                </Link>
              </Field>
            )}
          </dl>
        </CardContent>
      </Card>

      {isTransfer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-transfer" aria-hidden="true" />
              Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <LegLink leg={outLeg} current={tx} account={sourceAccount?.name} role="From" />
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              <LegLink leg={inLeg} current={tx} account={destinationAccount?.name} role="To" />
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Transfer status">{transfer ? <TransferStatusBadge status={transfer.status} /> : <span className="text-muted-foreground">Transfer record not found</span>}</Field>
              <Field label="Counterpart leg">
                {counterpart ? (
                  <Link to={`/transactions/${counterpart.id}`} className="text-primary underline-offset-4 hover:underline">
                    View the {counterpart.transferDirection === 'in' ? 'incoming' : 'outgoing'} leg
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Missing — the other leg was not found</span>
                )}
              </Field>
            </dl>
            <div>
              <Button asChild variant="outline" size="sm">
                <Link to="/transfers">
                  <ArrowLeftRight aria-hidden="true" />
                  Open transfers
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <Button asChild variant="ghost">
          <Link to="/transactions">
            <ArrowLeft aria-hidden="true" />
            Back to transactions
          </Link>
        </Button>
      </div>

      <DeleteTransactionDialog transaction={deleting ? tx : null} onClose={() => setDeleting(false)} onDeleted={() => navigate('/transactions', { replace: true })} />
    </PageContainer>
  )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

function LegLink({ leg, current, account, role }: { leg: Transaction | null; current: Transaction; account: string | undefined; role: 'From' | 'To' }) {
  const name = account ?? 'Unknown account'
  const isCurrent = leg?.id === current.id
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground">{role}</span>
      {leg && !isCurrent ? (
        <Link to={`/transactions/${leg.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {name}
        </Link>
      ) : (
        <span className="font-medium">
          {name}
          {isCurrent && <span className="ml-1 text-xs font-normal text-muted-foreground">(this leg)</span>}
        </span>
      )}
    </span>
  )
}
