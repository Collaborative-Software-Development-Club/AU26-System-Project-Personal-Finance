import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { AccountSelector, CategorySelector, MoneyDisplay } from '@/components/financial'
import { DateInput, FormActions, FormField, FormGrid, MoneyInput } from '@/components/forms'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import {
  ACCOUNT_TYPE_LABEL,
  DESCRIPTION_MAX_LENGTH,
  TRANSACTION_TYPE_LABEL,
  hasErrors,
  isLiabilityAccountType,
  isValidISODate,
  parseMoney,
  toDecimalString,
  todayISO,
  validateTransaction,
  type FieldErrors,
  type Transaction,
  type TransactionFormValues,
} from '@/domain'
import type { TransactionInput } from '@/api'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccounts, useAccountsWithBalance, useCategories, useFinanceStore, useIsPending, useTransaction } from '@/store'
import { EntityNotFound } from '@/pages/errors/entity-not-found'

type FormType = TransactionFormValues['type']

export default function TransactionFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const existing = useTransaction(id)
  if (id && !existing) return <EntityNotFound entity="Transaction" backTo="/transactions" backLabel="Back to transactions" />
  if (existing && existing.type === 'transfer') return <TransferLegNotice transaction={existing} />
  return <TransactionForm key={id ?? 'new'} transaction={existing} prefill={searchParams} />
}

/** Editing a transfer leg is not allowed; explain and point to the right place. */
function TransferLegNotice({ transaction }: { transaction: Transaction }) {
  usePageHeader({ title: 'Edit transaction', breadcrumbs: [{ label: 'Transactions', to: '/transactions' }] })
  return (
    <PageContainer width="narrow">
      <Alert>
        <ArrowLeftRight aria-hidden="true" />
        <AlertTitle>Transfer legs cannot be edited individually</AlertTitle>
        <AlertDescription>
          <p>“{transaction.description}” is one leg of a transfer. Changing a single leg would leave the two accounts inconsistent. Delete the transfer and record it again instead.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/transfers">Open transfers</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={`/transactions/${transaction.id}`}>View this leg</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </PageContainer>
  )
}

function initialValues(tx: Transaction | null, params: URLSearchParams, fallbackAccountId: string): TransactionFormValues {
  if (tx && tx.type !== 'transfer') {
    return {
      type: tx.type,
      amount: toDecimalString(tx.amount, tx.currency),
      description: tx.description,
      accountId: tx.accountId,
      categoryId: tx.categoryId ?? '',
      date: tx.date,
      notes: tx.notes ?? '',
    }
  }
  const type = params.get('type')
  const date = params.get('date') ?? ''
  return {
    type: type === 'income' ? 'income' : 'expense',
    amount: params.get('amount') ?? '',
    description: params.get('description') ?? '',
    accountId: params.get('accountId') || fallbackAccountId,
    categoryId: params.get('categoryId') ?? '',
    date: isValidISODate(date) ? date : todayISO(),
    notes: '',
  }
}

function TransactionForm({ transaction, prefill }: { transaction: Transaction | null; prefill: URLSearchParams }) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const accounts = useAccounts()
  const categories = useCategories()
  const accountsWithBalance = useAccountsWithBalance()
  const createTransaction = useFinanceStore((s) => s.createTransaction)
  const updateTransaction = useFinanceStore((s) => s.updateTransaction)
  const reconcile = useFinanceStore((s) => s.reconcile)

  const editing = transaction !== null
  const activeAccounts = accountsWithBalance.filter((a) => a.status === 'active')
  const [values, setValues] = useState<TransactionFormValues>(() =>
    initialValues(transaction, prefill, activeAccounts.length === 1 ? activeAccounts[0]!.id : ''),
  )
  const [errors, setErrors] = useState<FieldErrors<keyof TransactionFormValues>>({})
  const amountRef = useRef<HTMLInputElement>(null)

  const save = useAsyncAction(async (input: TransactionInput, summary: string) =>
    transaction ? updateTransaction(transaction.id, input) : createTransaction(input, summary),
  )
  const checking = useIsPending(`reconcile:${save.idempotencyKey ?? ''}`)

  const selectedAccount = accountsWithBalance.find((a) => a.id === values.accountId) ?? null
  const currency = selectedAccount?.currency ?? fmt.defaultCurrency
  const update = <K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const changeType = (type: FormType) => {
    setValues((v) => {
      const category = categories.find((c) => c.id === v.categoryId)
      const keepCategory = category && (category.type === 'both' || category.type === type)
      return { ...v, type, categoryId: keepCategory ? v.categoryId : '' }
    })
    setErrors((e) => ({ ...e, categoryId: undefined }))
  }

  usePageHeader({
    title: editing ? 'Edit transaction' : 'Add transaction',
    description: editing ? 'Update the details of this transaction.' : 'Record an income or expense. Transfers between your accounts have their own page.',
    breadcrumbs: [{ label: 'Transactions', to: '/transactions' }, ...(transaction ? [{ label: transaction.description, to: `/transactions/${transaction.id}` }] : [])],
  })

  const cancelTo = transaction ? `/transactions/${transaction.id}` : '/transactions'

  const submit = async (mode: 'finish' | 'another') => {
    const errs = validateTransaction(values, { accounts, categories })
    setErrors(errs)
    if (hasErrors(errs)) return
    const amount = parseMoney(values.amount, currency)
    if (amount === null) return
    const input: TransactionInput = {
      type: values.type,
      amount,
      description: values.description.trim(),
      accountId: values.accountId,
      categoryId: values.categoryId,
      date: values.date,
      notes: values.notes.trim() || null,
    }
    const summary = `${TRANSACTION_TYPE_LABEL[values.type]} ${fmt.money(amount, currency)} — ${input.description}`
    const result = await save.run(input, summary)
    if (!result) return
    if (editing) {
      toast.success('Transaction updated')
      navigate(`/transactions/${result.id}`)
      return
    }
    if (mode === 'another') {
      toast.success('Transaction recorded', { description: 'Ready for the next one.' })
      setValues((v) => ({ ...v, amount: '', description: '', notes: '' }))
      setErrors({})
      save.reset()
      amountRef.current?.focus()
      return
    }
    toast.success('Transaction recorded')
    navigate(`/transactions/${result.id}`)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit('finish')
  }

  const checkStatus = async () => {
    if (!save.idempotencyKey) return
    try {
      const outcome = await reconcile(save.idempotencyKey)
      if (outcome === 'committed') {
        toast.success('Transaction was recorded', { description: 'The server confirmed it was saved.' })
        navigate('/transactions')
      } else {
        toast.info('Transaction was not recorded', { description: 'The server has no record of it. You can submit it again.' })
        save.reset()
      }
    } catch (err) {
      toast.error('Could not check status', { description: err instanceof Error ? err.message : undefined })
    }
  }

  const liability = selectedAccount ? isLiabilityAccountType(selectedAccount.type) : false

  return (
    <PageContainer width="narrow">
      {activeAccounts.length === 0 && !editing && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>No active accounts</AlertTitle>
          <AlertDescription>
            <p>Transactions must belong to an account.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/accounts/new">Create an account</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span id="tx-type-label" className="text-sm font-medium">
                Type
              </span>
              <Tabs value={values.type} onValueChange={(v) => changeType(v as FormType)}>
                <TabsList aria-labelledby="tx-type-label" className="w-full sm:w-auto">
                  <TabsTrigger value="expense" className="sm:min-w-28">
                    <ArrowUpRight className="text-expense" aria-hidden="true" />
                    Expense
                  </TabsTrigger>
                  <TabsTrigger value="income" className="sm:min-w-28">
                    <ArrowDownLeft className="text-income" aria-hidden="true" />
                    Income
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <FormGrid>
              <FormField label="Amount" required error={errors.amount ?? save.fieldErrors.amount} description={`Entered in ${currency}; the account's currency.`}>
                <MoneyInput ref={amountRef} value={values.amount} onChange={(v) => update('amount', v)} currency={currency} autoFocus={!editing && !!values.accountId} />
              </FormField>
              <FormField label="Date" required error={errors.date ?? save.fieldErrors.date}>
                <DateInput value={values.date} onChange={(v) => update('date', v)} />
              </FormField>
            </FormGrid>

            <FormField label="Description" required error={errors.description ?? save.fieldErrors.description}>
              <Input value={values.description} onChange={(e) => update('description', e.target.value)} maxLength={DESCRIPTION_MAX_LENGTH} placeholder="e.g. Groceries at Market St" />
            </FormField>

            <FormGrid>
              <FormField
                label="Account"
                required
                error={errors.accountId ?? save.fieldErrors.accountId}
                description={
                  selectedAccount
                    ? `${ACCOUNT_TYPE_LABEL[selectedAccount.type]} · ${liability ? 'amount owed' : 'balance'} ${fmt.money(selectedAccount.balance, selectedAccount.currency)} in this app`
                    : undefined
                }
              >
                <AccountSelector value={values.accountId} onChange={(v) => update('accountId', v)} includeArchived={editing} />
              </FormField>
              <FormField label="Category" required error={errors.categoryId ?? save.fieldErrors.categoryId} description={`Showing ${values.type} categories.`}>
                <CategorySelector type={values.type} value={values.categoryId} onChange={(v) => update('categoryId', v)} />
              </FormField>
            </FormGrid>

            <FormField label="Notes" hintLabel="(optional)" error={errors.notes ?? save.fieldErrors.notes}>
              <Textarea value={values.notes} onChange={(e) => update('notes', e.target.value)} rows={3} maxLength={DESCRIPTION_MAX_LENGTH} />
            </FormField>

            {selectedAccount && values.amount && parseMoney(values.amount, currency) !== null && (
              <p className="text-xs text-muted-foreground">
                Preview: <MoneyDisplay amount={parseMoney(values.amount, currency) ?? 0} currency={currency} variant="type" type={values.type} size="sm" /> on {selectedAccount.name}. Recording it updates the balance shown here; it does not move money at your bank.
              </p>
            )}

            {save.status === 'error' && <FormErrorMessage message={save.error} />}
            {save.status === 'unknown' && (
              <OutcomeUnknownNotice
                description="The request was sent but no confirmation came back, so this transaction may or may not have been recorded. Check its status before submitting again — a second submit could create a duplicate. The banner at the top of the page also tracks it."
                onCheckStatus={() => void checkStatus()}
                checking={checking}
              />
            )}

            <FormActions
              submitLabel={editing ? 'Save changes' : 'Save transaction'}
              pending={save.isPending}
              disabled={save.status === 'unknown' || (!editing && activeAccounts.length === 0)}
              onCancel={() => navigate(cancelTo)}
              secondary={
                !editing && (
                  <Button type="button" variant="outline" disabled={save.isPending || save.status === 'unknown' || activeAccounts.length === 0} onClick={() => void submit('another')}>
                    Save and add another
                  </Button>
                )
              }
            />
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
