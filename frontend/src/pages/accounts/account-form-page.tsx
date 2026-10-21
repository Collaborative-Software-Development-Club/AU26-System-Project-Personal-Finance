import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { ColorSwatchPicker, FormActions, FormField, FormGrid, MoneyInput, SelectInput, type SelectOption } from '@/components/forms'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import {
  ACCOUNT_TYPES,
  CURRENCIES,
  CURRENCY_CODES,
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  hasErrors,
  isCurrencyCode,
  isLiabilityAccountType,
  parseMoney,
  toDecimalString,
  validateAccount,
  type AccountFormValues,
  type AccountType,
  type AccountWithBalance,
  type CurrencyCode,
  type FieldErrors,
} from '@/domain'
import type { AccountInput } from '@/api'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccountWithBalance, useFinanceStore } from '@/store'
import { EntityNotFound } from '@/pages/errors/entity-not-found'

export default function AccountFormPage() {
  const { id } = useParams<{ id: string }>()
  const account = useAccountWithBalance(id)
  if (id && !account) return <EntityNotFound entity="Account" backTo="/accounts" backLabel="Back to accounts" />
  return <AccountForm key={id ?? 'new'} account={account} />
}

const TYPE_OPTIONS: SelectOption<AccountType>[] = ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label, description: t.description }))
const CURRENCY_OPTIONS: SelectOption<CurrencyCode>[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: `${code} — ${CURRENCIES[code].name}`,
  description: CURRENCIES[code].symbol,
}))

function initialValues(account: AccountWithBalance | null, defaultCurrency: CurrencyCode): AccountFormValues {
  if (!account) return { name: '', type: '', currency: defaultCurrency, openingBalance: '', description: '', color: '' }
  return {
    name: account.name,
    type: account.type,
    currency: account.currency,
    openingBalance: toDecimalString(account.openingBalance, account.currency),
    description: account.description ?? '',
    color: account.color ?? '',
  }
}

function AccountForm({ account }: { account: AccountWithBalance | null }) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const createAccount = useFinanceStore((s) => s.createAccount)
  const updateAccount = useFinanceStore((s) => s.updateAccount)

  const editing = account !== null
  const currencyLocked = editing && account.transactionCount > 0
  const [values, setValues] = useState<AccountFormValues>(() => initialValues(account, fmt.defaultCurrency))
  const [errors, setErrors] = useState<FieldErrors<keyof AccountFormValues>>({})

  const save = useAsyncAction(async (input: AccountInput) => (account ? updateAccount(account.id, input) : createAccount(input)))

  const update = <K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  usePageHeader({
    title: editing ? 'Edit account' : 'Add account',
    description: editing ? `Update the details of ${account.name}.` : 'Create an account to track its balance and activity.',
    breadcrumbs: [{ label: 'Accounts', to: '/accounts' }, ...(account ? [{ label: account.name, to: `/accounts/${account.id}` }] : [])],
  })

  const currency: CurrencyCode = values.currency && isCurrencyCode(values.currency) ? values.currency : fmt.defaultCurrency
  const liability = values.type ? isLiabilityAccountType(values.type) : false
  const cancelTo = account ? `/accounts/${account.id}` : '/accounts'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateAccount(values)
    setErrors(errs)
    if (hasErrors(errs) || !values.type || !values.currency) return
    const openingBalance = parseMoney(values.openingBalance || '0', currency)
    if (openingBalance === null) return
    const input: AccountInput = {
      name: values.name.trim(),
      type: values.type,
      currency,
      openingBalance,
      description: values.description.trim() || null,
      color: values.color || null,
    }
    const result = await save.run(input)
    if (!result) return
    toast.success(editing ? 'Account updated' : 'Account created')
    navigate(`/accounts/${result.id}`)
  }

  return (
    <PageContainer width="narrow">
      <Card>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
            <FormField label="Account name" required error={errors.name ?? save.fieldErrors.name}>
              <Input value={values.name} onChange={(e) => update('name', e.target.value)} maxLength={NAME_MAX_LENGTH} placeholder="e.g. Everyday Checking" autoFocus={!editing} />
            </FormField>

            <FormGrid>
              <FormField label="Account type" required error={errors.type ?? save.fieldErrors.type} description={liability ? 'Credit accounts track the amount you owe; they count as liabilities.' : undefined}>
                <SelectInput<AccountType> value={values.type} onChange={(v) => update('type', v)} options={TYPE_OPTIONS} placeholder="Select type" />
              </FormField>
              <FormField
                label="Currency"
                required
                error={errors.currency ?? save.fieldErrors.currency}
                description={currencyLocked ? 'Locked: the currency cannot change once an account has transactions.' : 'All transactions in this account use this currency.'}
              >
                <SelectInput<CurrencyCode> value={values.currency} onChange={(v) => update('currency', v)} options={CURRENCY_OPTIONS} disabled={currencyLocked} placeholder="Select currency" />
              </FormField>
            </FormGrid>
            {currencyLocked && (
              <p className="-mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" aria-hidden="true" />
                {account.transactionCount} transaction{account.transactionCount === 1 ? '' : 's'} already use {account.currency}.
              </p>
            )}

            <FormField
              label={liability ? 'Opening balance (amount owed)' : 'Opening balance'}
              required={!editing}
              error={errors.openingBalance ?? save.fieldErrors.openingBalance}
              description={
                liability
                  ? 'Enter the amount currently owed on this card. The current balance is derived from this value plus posted transactions.'
                  : 'The balance before any transactions were recorded. The current balance is derived from this value plus posted transactions.'
              }
            >
              <MoneyInput value={values.openingBalance} onChange={(v) => update('openingBalance', v)} currency={currency} />
            </FormField>

            <FormField label="Description" hintLabel="(optional)" error={errors.description ?? save.fieldErrors.description}>
              <Textarea value={values.description} onChange={(e) => update('description', e.target.value)} rows={3} maxLength={DESCRIPTION_MAX_LENGTH} placeholder="What is this account for?" />
            </FormField>

            <FormField label="Colour" hintLabel="(optional)" error={errors.color ?? save.fieldErrors.color} description="Used to tell accounts apart in lists and charts.">
              <ColorSwatchPicker value={values.color} onChange={(v) => update('color', v)} />
            </FormField>
            {values.color && (
              <div className="-mt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => update('color', '')}>
                  Clear colour
                </Button>
              </div>
            )}

            {save.status === 'error' && <FormErrorMessage message={save.error} />}
            {save.status === 'unknown' && (
              <OutcomeUnknownNotice description="The request was sent but no confirmation came back, so this account may or may not have been saved. Check the Accounts list before submitting again." />
            )}

            <FormActions submitLabel={editing ? 'Save changes' : 'Create account'} pending={save.isPending} onCancel={() => navigate(cancelTo)} />
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
