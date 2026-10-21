import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { AccountSelector, CategorySelector, RecurringStatusBadge } from '@/components/financial'
import { DateInput, FormActions, FormField, FormGrid, MoneyInput, SelectInput, type SelectOption } from '@/components/forms'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import {
  DESCRIPTION_MAX_LENGTH,
  FREQUENCIES,
  describeFrequency,
  hasErrors,
  isValidISODate,
  parseISODate,
  parseMoney,
  toDecimalString,
  todayISO,
  upcomingOccurrences,
  validateRecurring,
  type FieldErrors,
  type RecurrenceFrequency,
  type RecurringFormValues,
  type RecurringRule,
} from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccounts, useAccountsWithBalance, useCategories, useFinanceStore } from '@/store'
import { EntityNotFound } from '@/pages/errors/entity-not-found'

/** Input shape of the store's create/update actions (pages never import `@/api`). */
type RecurringRuleInput = Parameters<ReturnType<typeof useFinanceStore.getState>['createRecurringRule']>[0]

type FormType = RecurringFormValues['type']

const FREQUENCY_OPTIONS: SelectOption<RecurrenceFrequency>[] = FREQUENCIES.map((f) => ({
  value: f.value,
  label: f.label,
}))

const PREVIEW_COUNT = 6

export default function RecurringFormPage() {
  const { id } = useParams<{ id: string }>()
  const rule = useFinanceStore((s) => (id ? (s.recurringRules.find((r) => r.id === id) ?? null) : null))
  if (id && !rule) return <EntityNotFound entity="Recurring rule" backTo="/recurring" backLabel="Back to recurring" />
  return <RecurringForm key={rule?.id ?? 'new'} rule={rule} />
}

function initialValues(rule: RecurringRule | null, params: URLSearchParams, fallbackAccountId: string): RecurringFormValues {
  if (rule) {
    return {
      description: rule.description,
      type: rule.type,
      amount: toDecimalString(rule.amount, rule.currency),
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      frequency: rule.frequency,
      interval: String(rule.interval),
      startDate: rule.startDate,
      endDate: rule.endDate ?? '',
      notes: rule.notes ?? '',
    }
  }
  const type = params.get('type')
  const start = params.get('startDate') ?? params.get('date') ?? ''
  const end = params.get('endDate') ?? ''
  const frequency = params.get('frequency')
  const interval = params.get('interval') ?? '1'
  return {
    description: params.get('description') ?? '',
    type: type === 'income' ? 'income' : 'expense',
    amount: params.get('amount') ?? '',
    accountId: params.get('accountId') || fallbackAccountId,
    categoryId: params.get('categoryId') ?? '',
    frequency: frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly' || frequency === 'yearly' ? frequency : 'monthly',
    interval: interval,
    startDate: isValidISODate(start) ? start : todayISO(),
    endDate: isValidISODate(end) ? end : '',
    notes: '',
  }
}

function RecurringForm({ rule }: { rule: RecurringRule | null }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fmt = useFormatters()
  const accounts = useAccounts()
  const categories = useCategories()
  const accountsWithBalance = useAccountsWithBalance()
  const createRecurringRule = useFinanceStore((s) => s.createRecurringRule)
  const updateRecurringRule = useFinanceStore((s) => s.updateRecurringRule)

  const editing = rule !== null
  const activeAccounts = accountsWithBalance.filter((a) => a.status === 'active')
  const [values, setValues] = useState<RecurringFormValues>(() =>
    initialValues(rule, searchParams, activeAccounts.length === 1 ? activeAccounts[0]!.id : ''),
  )
  const [errors, setErrors] = useState<FieldErrors<keyof RecurringFormValues>>({})

  const save = useAsyncAction(async (input: RecurringRuleInput) => (rule ? updateRecurringRule(rule.id, input) : createRecurringRule(input)))

  const selectedAccount = accountsWithBalance.find((a) => a.id === values.accountId) ?? null
  const currency = selectedAccount?.currency ?? fmt.defaultCurrency
  const frequencyMeta = FREQUENCIES.find((f) => f.value === values.frequency)
  const intervalNumber = Number(values.interval)
  const intervalLabel = frequencyMeta
    ? intervalNumber === 1
      ? frequencyMeta.unit
      : `${frequencyMeta.unit}s`
    : 'period'

  const update = <K extends keyof RecurringFormValues>(key: K, value: RecurringFormValues[K]) => {
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
    title: editing ? 'Edit recurring rule' : 'New recurring rule',
    description: editing ? 'Adjust the schedule. Saving does not create transactions.' : 'Describe a transaction you expect to repeat. Saving the rule does not record any transactions.',
    breadcrumbs: [{ label: 'Recurring', to: '/recurring' }],
  })

  const schedulePreview = useMemo(() => {
    if (!values.frequency || !isValidISODate(values.startDate)) return []
    if (!Number.isInteger(intervalNumber) || intervalNumber < 1) return []
    const endDate = values.endDate && isValidISODate(values.endDate) ? values.endDate : null
    if (endDate && endDate < values.startDate) return []
    return upcomingOccurrences(
      { startDate: values.startDate, endDate, frequency: values.frequency, interval: intervalNumber },
      PREVIEW_COUNT,
    )
  }, [values.frequency, values.startDate, values.endDate, intervalNumber])

  const startDay = parseISODate(values.startDate)?.getDate() ?? 0
  const showsClampNote = (values.frequency === 'monthly' || values.frequency === 'yearly') && startDay > 28

  const fieldError = (key: keyof RecurringFormValues) => errors[key] ?? save.fieldErrors[key]
  const hasApiFieldError = Object.keys(save.fieldErrors).length > 0

  const toInput = (): RecurringRuleInput | null => {
    const amount = parseMoney(values.amount, currency)
    if (amount === null || !values.frequency || !values.accountId || !values.categoryId) return null
    return {
      description: values.description.trim(),
      type: values.type,
      amount,
      accountId: values.accountId,
      categoryId: values.categoryId,
      frequency: values.frequency,
      interval: Number(values.interval),
      startDate: values.startDate,
      endDate: values.endDate || null,
      notes: values.notes.trim() || null,
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateRecurring(values, { accounts, categories })
    setErrors(errs)
    if (hasErrors(errs)) return
    const input = toInput()
    if (!input) return
    const result = await save.run(input)
    if (result) {
      const next = result.nextRunDate ? ` Next run ${fmt.date(result.nextRunDate)}.` : ' The schedule has no remaining dates.'
      toast.success(editing ? 'Rule updated' : 'Rule created', { description: `${describeFrequency(result.frequency, result.interval)}.${next}` })
      navigate('/recurring')
    }
  }

  const cancelled = rule?.status === 'cancelled'
  const completed = rule?.status === 'completed'

  return (
    <PageContainer width="narrow">
      <Alert>
        <CalendarClock aria-hidden="true" />
        <AlertTitle>Schedules describe intent</AlertTitle>
        <AlertDescription>
          Saving this rule does not create transactions, even if a date is today or in the past. The backend will record each occurrence when it runs.
        </AlertDescription>
      </Alert>

      {editing && rule && (cancelled || completed) && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle className="flex items-center gap-2">
            {cancelled ? 'This rule is cancelled' : 'This schedule has ended'}
            <RecurringStatusBadge status={rule.status} />
          </AlertTitle>
          <AlertDescription>
            {cancelled
              ? 'A cancelled rule cannot be resumed. You can still edit the details, or create a new rule instead.'
              : 'There are no remaining occurrences. Extending the end date or changing the start date may reactivate it when you save.'}
          </AlertDescription>
        </Alert>
      )}

      {activeAccounts.length === 0 && !editing && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>No active accounts</AlertTitle>
          <AlertDescription>
            <p>A recurring rule must belong to an account.</p>
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
              <span id="rule-type-label" className="text-sm font-medium">
                Type
              </span>
              <Tabs value={values.type} onValueChange={(v) => changeType(v as FormType)}>
                <TabsList aria-labelledby="rule-type-label" className="w-full sm:w-auto">
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

            <FormField label="Description" required error={fieldError('description')}>
              <Input
                value={values.description}
                onChange={(e) => update('description', e.target.value)}
                maxLength={DESCRIPTION_MAX_LENGTH}
                placeholder="e.g. Monthly rent"
                autoFocus={!editing}
              />
            </FormField>

            <FormGrid>
              <FormField label="Amount" required error={fieldError('amount')} description={`Entered in ${currency}; the account's currency.`}>
                <MoneyInput value={values.amount} onChange={(v) => update('amount', v)} currency={currency} />
              </FormField>
              <FormField label="Account" required error={fieldError('accountId')}>
                <AccountSelector value={values.accountId} onChange={(v) => update('accountId', v)} includeArchived={editing} />
              </FormField>
            </FormGrid>

            <FormField label="Category" required error={fieldError('categoryId')} description={`Showing ${values.type} categories.`}>
              <CategorySelector type={values.type} value={values.categoryId} onChange={(v) => update('categoryId', v)} />
            </FormField>

            <FormGrid>
              <FormField label="Frequency" required error={fieldError('frequency')}>
                <SelectInput<RecurrenceFrequency> value={values.frequency} onChange={(v) => update('frequency', v)} options={FREQUENCY_OPTIONS} />
              </FormField>
              <FormField
                label="Interval"
                required
                error={fieldError('interval')}
                description={`Every ${Number.isInteger(intervalNumber) && intervalNumber >= 1 ? intervalNumber : 'N'} ${intervalLabel}.`}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  step={1}
                  value={values.interval}
                  onChange={(e) => update('interval', e.target.value)}
                  className="tabular w-32"
                />
              </FormField>
            </FormGrid>

            <FormGrid>
              <FormField label="Start date" required error={fieldError('startDate')}>
                <DateInput value={values.startDate} onChange={(v) => update('startDate', v)} />
              </FormField>
              <FormField label="End date" hintLabel="(optional)" error={fieldError('endDate')} description="Leave empty for an open-ended schedule.">
                <DateInput value={values.endDate} onChange={(v) => update('endDate', v)} min={values.startDate || undefined} />
              </FormField>
            </FormGrid>

            {showsClampNote && (
              <p className="text-xs text-muted-foreground">
                Months without a day {startDay} use the last day of that month. The schedule returns to the {startDay}th in longer months.
              </p>
            )}

            {schedulePreview.length > 0 && (
              <div className="rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/10">
                <p className="text-sm font-medium">
                  {values.frequency ? describeFrequency(values.frequency, Number.isInteger(intervalNumber) ? intervalNumber : 1) : 'Schedule'}
                  {schedulePreview[0] ? ` · next ${fmt.date(schedulePreview[0])}` : ''}
                </p>
                <ol className="mt-1.5 list-decimal pl-5 text-sm text-muted-foreground">
                  {schedulePreview.map((d) => (
                    <li key={d}>{fmt.date(d)}</li>
                  ))}
                </ol>
                <p className="mt-1.5 text-xs text-muted-foreground">Preview only. These dates are not recorded as transactions.</p>
              </div>
            )}

            <FormField label="Notes" hintLabel="(optional)" error={fieldError('notes')}>
              <Textarea value={values.notes} onChange={(e) => update('notes', e.target.value)} rows={3} maxLength={DESCRIPTION_MAX_LENGTH} />
            </FormField>

            {save.status === 'error' && !hasApiFieldError && <FormErrorMessage message={save.error} />}
            {save.status === 'unknown' && (
              <OutcomeUnknownNotice description="The request was sent but no confirmation came back. Check the recurring list before submitting again." />
            )}

            <FormActions
              submitLabel={editing ? 'Save changes' : 'Create rule'}
              pending={save.isPending}
              disabled={save.status === 'unknown' || (!editing && activeAccounts.length === 0)}
              onCancel={() => navigate('/recurring')}
            />
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
