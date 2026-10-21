import { toDecimalString, type Transaction } from '@/domain'

/**
 * URL of the create form pre-filled with another transaction's values.
 * Only income/expense rows can be duplicated; transfer legs go through /transfers.
 */
export function duplicateTransactionUrl(tx: Transaction): string {
  const params = new URLSearchParams()
  if (tx.type !== 'transfer') params.set('type', tx.type)
  params.set('accountId', tx.accountId)
  if (tx.categoryId) params.set('categoryId', tx.categoryId)
  params.set('amount', toDecimalString(tx.amount, tx.currency))
  params.set('description', tx.description)
  params.set('date', tx.date)
  return `/transactions/new?${params.toString()}`
}
