/**
 * Confirmation dialog for deleting a transaction.
 *
 * A transfer leg is never deleted on its own: deleting it removes the whole
 * transfer (both legs) through `deleteTransfer`, so the two account balances
 * stay consistent. Ordinary income/expense rows go through `deleteTransaction`.
 */
import { ArrowRight } from 'lucide-react'
import { ConfirmDialog, FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { MoneyDisplay } from '@/components/financial'
import type { Transaction } from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccountMap, useFinanceStore, useTransactions } from '@/store'

export interface DeleteTransactionDialogProps {
  /** The row the user asked to delete; null keeps the dialog closed. */
  transaction: Transaction | null
  onClose(): void
  /** Called after a confirmed deletion (e.g. to navigate away from a details page). */
  onDeleted?(transaction: Transaction): void
}

export function DeleteTransactionDialog({ transaction, onClose, onDeleted }: DeleteTransactionDialogProps) {
  const fmt = useFormatters()
  const accounts = useAccountMap()
  const transactions = useTransactions()
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction)
  const deleteTransfer = useFinanceStore((s) => s.deleteTransfer)

  const remove = useAsyncAction(async (tx: Transaction) => {
    if (tx.type === 'transfer' && tx.transferId) await deleteTransfer(tx.transferId)
    else await deleteTransaction(tx.id)
    return tx
  })

  const isTransfer = transaction?.type === 'transfer'
  const counterpart =
    transaction && isTransfer
      ? transactions.find((t) => t.transferId === transaction.transferId && t.id !== transaction.id) ?? null
      : null
  const outLeg = transaction?.transferDirection === 'out' ? transaction : counterpart
  const inLeg = transaction?.transferDirection === 'in' ? transaction : counterpart
  const sourceName = outLeg ? accounts.get(outLeg.accountId)?.name ?? 'Unknown account' : null
  const destinationName = inLeg ? accounts.get(inLeg.accountId)?.name ?? 'Unknown account' : null

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      remove.reset()
      onClose()
    }
  }

  const confirm = async () => {
    if (!transaction) return
    const result = await remove.run(transaction)
    if (!result) return
    toast.success(isTransfer ? 'Transfer deleted' : 'Transaction deleted')
    remove.reset()
    onClose()
    onDeleted?.(result)
  }

  return (
    <ConfirmDialog
      open={transaction !== null}
      onOpenChange={handleOpenChange}
      title={isTransfer ? 'Delete transfer?' : 'Delete transaction?'}
      description={
        isTransfer
          ? 'This row is one leg of a transfer. Deleting it removes the whole transfer — both the outgoing and the incoming leg — so neither account is left out of balance.'
          : 'This permanently removes the transaction. Balances, budgets and reports update accordingly.'
      }
      confirmLabel={isTransfer ? 'Delete transfer' : 'Delete'}
      destructive
      pending={remove.isPending}
      confirmDisabled={remove.status === 'unknown'}
      onConfirm={() => void confirm()}
    >
      {transaction && (
        <div className="flex flex-col gap-3 text-sm">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="truncate font-medium">{transaction.description}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
              <span>{fmt.date(transaction.date)}</span>
              <MoneyDisplay amount={transaction.amount} currency={transaction.currency} variant="type" type={transaction.type} transferDirection={transaction.transferDirection} size="sm" />
            </div>
            {isTransfer && sourceName && destinationName && (
              <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <span>{sourceName}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
                <span>{destinationName}</span>
              </div>
            )}
          </div>
          {remove.status === 'error' && <FormErrorMessage message={remove.error} />}
          {remove.status === 'unknown' && (
            <OutcomeUnknownNotice description="The delete request was sent but no confirmation came back. Close this dialog and check whether the row is still listed before trying again." />
          )}
        </div>
      )}
    </ConfirmDialog>
  )
}
