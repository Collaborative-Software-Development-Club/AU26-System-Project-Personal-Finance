import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { CategorySelector } from '@/components/financial'
import { FormActions, FormField, FormGrid, MoneyInput, MonthInput, SelectInput, type SelectOption } from '@/components/forms'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import {
  CURRENCIES,
  CURRENCY_CODES,
  currentMonthKey,
  hasErrors,
  isValidMonthKey,
  parseMoney,
  toDecimalString,
  validateBudget,
  type Budget,
  type BudgetFormValues,
  type CurrencyCode,
  type FieldErrors,
} from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useCategories, useFinanceStore, useSettingsStore } from '@/store'
import { EntityNotFound } from '@/pages/errors/entity-not-found'

/** Input shape of the store's create/update actions (pages never import `@/api`). */
type BudgetInput = Parameters<ReturnType<typeof useFinanceStore.getState>['createBudget']>[0]

const CURRENCY_OPTIONS: SelectOption<CurrencyCode>[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: `${code} — ${CURRENCIES[code].name}`,
}))

const MIN_THRESHOLD_PCT = 50
const MAX_THRESHOLD_PCT = 100

export default function BudgetFormPage() {
  const { id } = useParams<{ id: string }>()
  const budget = useFinanceStore((s) => (id ? s.budgets.find((b) => b.id === id) ?? null : null))
  if (id && !budget) return <EntityNotFound entity="Budget" backTo="/budgets" backLabel="Back to budgets" />
  // Key by id so switching between /new and /:id/edit resets the form state.
  return <BudgetForm key={budget?.id ?? 'new'} budget={budget} />
}

function thresholdToPercentString(threshold: number | null): string {
  return threshold === null ? '' : String(Math.round(threshold * 100))
}

function BudgetForm({ budget }: { budget: Budget | null }) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const [searchParams] = useSearchParams()
  const categories = useCategories()
  const budgets = useFinanceStore((s) => s.budgets)
  const createBudget = useFinanceStore((s) => s.createBudget)
  const updateBudget = useFinanceStore((s) => s.updateBudget)
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency)
  const defaultThreshold = useSettingsStore((s) => s.budgetWarningThreshold)
  const isEdit = budget !== null

  const [currency, setCurrency] = useState<CurrencyCode>(budget?.currency ?? defaultCurrency)
  const [values, setValues] = useState<BudgetFormValues>(() => {
    if (budget) {
      return {
        name: budget.name ?? '',
        categoryId: budget.categoryId,
        amount: toDecimalString(budget.amount, budget.currency),
        startMonth: budget.startMonth,
        endMonth: budget.endMonth ?? '',
        warningThreshold: thresholdToPercentString(budget.warningThreshold),
      }
    }
    const monthParam = searchParams.get('month')
    const categoryParam = searchParams.get('categoryId')
    return {
      name: '',
      categoryId: categoryParam && categories.some((c) => c.id === categoryParam) ? categoryParam : '',
      amount: '',
      startMonth: monthParam && isValidMonthKey(monthParam) ? monthParam : currentMonthKey(),
      endMonth: '',
      warningThreshold: '',
    }
  })
  const [errors, setErrors] = useState<FieldErrors<keyof BudgetFormValues>>({})

  const save = useAsyncAction(async (input: BudgetInput) => (budget ? updateBudget(budget.id, input) : createBudget(input)))

  usePageHeader({
    title: isEdit ? 'Edit budget' : 'New budget',
    description: isEdit ? 'Adjust the limit, period or warning threshold.' : 'Set a monthly spending limit for an expense category.',
    breadcrumbs: isEdit && budget ? [{ label: 'Budgets', to: '/budgets' }, { label: 'Details', to: `/budgets/${budget.id}` }] : [{ label: 'Budgets', to: '/budgets' }],
  })

  const set = <K extends keyof BudgetFormValues>(key: K, value: BudgetFormValues[K]) => setValues((v) => ({ ...v, [key]: value }))
  const fieldError = (key: keyof BudgetFormValues) => errors[key] ?? (save.fieldErrors[key] ? save.error ?? save.fieldErrors[key] : undefined)
  const hasApiFieldError = Object.keys(save.fieldErrors).length > 0
  const backTo = budget ? `/budgets/${budget.id}` : '/budgets'

  const validate = (): FieldErrors<keyof BudgetFormValues> => {
    const errs = validateBudget(values, { categories, budgets, currency, editingId: budget?.id ?? null })
    // The UI exposes a narrower threshold range (50–100%) than the domain minimum.
    if (!errs.warningThreshold && values.warningThreshold.trim() !== '') {
      const pct = Number(values.warningThreshold)
      if (pct < MIN_THRESHOLD_PCT || pct > MAX_THRESHOLD_PCT || !Number.isInteger(pct)) {
        errs.warningThreshold = `Threshold must be a whole number between ${MIN_THRESHOLD_PCT} and ${MAX_THRESHOLD_PCT} percent.`
      }
    }
    return errs
  }

  const toInput = (): BudgetInput => ({
    name: values.name.trim() || null,
    categoryId: values.categoryId,
    amount: parseMoney(values.amount, currency) ?? 0,
    currency,
    startMonth: values.startMonth,
    endMonth: values.endMonth || null,
    warningThreshold: values.warningThreshold.trim() === '' ? null : Number(values.warningThreshold) / 100,
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (hasErrors(errs)) return
    const result = await save.run(toInput())
    if (result) {
      toast.success(isEdit ? 'Budget updated' : 'Budget created')
      navigate(`/budgets/${result.id}`)
    }
  }

  return (
    <PageContainer width="narrow">
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <FormField label="Category" required error={fieldError('categoryId')} description="Budgets track expense categories only.">
              <CategorySelector type="expense" value={values.categoryId} onChange={(v) => set('categoryId', v)} />
            </FormField>

            <FormField label="Name" hintLabel="(optional)" error={fieldError('name')} description="Shown instead of the category name, e.g. “Groceries — family”.">
              <Input value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={200} autoComplete="off" />
            </FormField>

            <FormGrid>
              <FormField label="Monthly limit" required error={fieldError('amount')}>
                <MoneyInput value={values.amount} onChange={(v) => set('amount', v)} currency={currency} />
              </FormField>
              <FormField label="Currency" required>
                <SelectInput<CurrencyCode> value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
              </FormField>
            </FormGrid>

            <FormGrid>
              <FormField label="Start month" required error={fieldError('startMonth')}>
                <MonthInput value={values.startMonth} onChange={(v) => set('startMonth', v)} />
              </FormField>
              <FormField label="End month" hintLabel="(optional)" error={fieldError('endMonth')} description="Leave empty for an open-ended budget.">
                <MonthInput value={values.endMonth} onChange={(v) => set('endMonth', v)} min={values.startMonth || undefined} />
              </FormField>
            </FormGrid>

            <FormField
              label="Warning threshold"
              hintLabel="(optional)"
              error={fieldError('warningThreshold')}
              description={`Percent of the limit at which the budget shows “Near limit”. Leave blank to use your default of ${fmt.percent(defaultThreshold * 100)}.`}
            >
              <div className="relative w-40">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={MIN_THRESHOLD_PCT}
                  max={MAX_THRESHOLD_PCT}
                  step={1}
                  value={values.warningThreshold}
                  onChange={(e) => set('warningThreshold', e.target.value)}
                  placeholder={String(Math.round(defaultThreshold * 100))}
                  className="tabular pr-8"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground" aria-hidden="true">
                  %
                </span>
              </div>
            </FormField>

            {save.status === 'error' && !hasApiFieldError && <FormErrorMessage message={save.error} />}
            {save.status === 'unknown' && <OutcomeUnknownNotice description="The request was sent but no confirmation came back. Check the budgets list before submitting again." />}

            <FormActions submitLabel={isEdit ? 'Save changes' : 'Create budget'} pending={save.isPending} onCancel={() => navigate(backTo)} />
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
