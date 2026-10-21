import { useId } from 'react'
import { FormField, FormGrid, SelectInput, type SelectOption } from '@/components/forms'
import { AccountSelector } from '@/components/financial'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Id } from '@/domain'
import {
  CSV_DATE_FORMAT_OPTIONS,
  FIELD_LABEL,
  type AmountMode,
  type CsvDateFormat,
  type CsvRow,
  type ImportField,
  type MappingConfig,
  type MappingErrors,
  type SignConvention,
} from './csv-import-logic'

export interface ColumnMapperProps {
  headers: string[]
  sampleRow: CsvRow | null
  config: MappingConfig
  onChange(config: MappingConfig): void
  errors: MappingErrors
  defaultAccountId: Id | ''
  onDefaultAccountChange(id: Id | ''): void
}

const NONE = '__none__'

/** Map CSV headers onto transaction fields, plus amount/date interpretation. */
export function ColumnMapper({ headers, sampleRow, config, onChange, errors, defaultAccountId, onDefaultAccountChange }: ColumnMapperProps) {
  const baseId = useId()
  const headerOptions: SelectOption[] = [
    { value: NONE, label: 'Not mapped' },
    ...headers.map((h) => ({ value: h, label: h, description: sampleRow ? truncate(sampleRow[h] ?? '') : undefined })),
  ]

  const setField = (field: ImportField, header: string) =>
    onChange({ ...config, mapping: { ...config.mapping, [field]: header === NONE ? '' : header } })

  const fieldSelect = (field: ImportField, opts: { required?: boolean; description?: string } = {}) => (
    <FormField
      key={field}
      label={FIELD_LABEL[field]}
      required={opts.required}
      hintLabel={opts.required ? undefined : '(optional)'}
      description={opts.description}
      error={errors[field]}
    >
      <SelectInput value={config.mapping[field] || NONE} onChange={(v) => setField(field, v)} options={headerOptions} />
    </FormField>
  )

  const showSignConvention = config.amountMode === 'signed' && !config.mapping.type

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">How are amounts expressed?</legend>
        <RadioGroup
          value={config.amountMode}
          onValueChange={(v) => onChange({ ...config, amountMode: v as AmountMode })}
          className="gap-2 sm:grid-cols-2"
          aria-label="Amount layout"
        >
          <RadioChoice
            id={`${baseId}-signed`}
            value="signed"
            label="One amount column"
            description="A single column, optionally with a separate type column or a sign."
          />
          <RadioChoice
            id={`${baseId}-dc`}
            value="debitCredit"
            label="Separate debit and credit columns"
            description="Money out and money in are in different columns."
          />
        </RadioGroup>
      </fieldset>

      <FormGrid>
        {fieldSelect('date', { required: true })}
        {fieldSelect('description', { required: true })}
        {config.amountMode === 'signed' ? (
          <>
            {fieldSelect('amount', { required: true })}
            {fieldSelect('type', { description: 'Values like income/expense, credit/debit or deposit/withdrawal. When empty, the sign decides.' })}
          </>
        ) : (
          <>
            {fieldSelect('debit', { required: true })}
            {fieldSelect('credit', { required: true })}
          </>
        )}
        {fieldSelect('category', { description: 'Matched to your categories by name (case-insensitive). Unmatched names are left uncategorised.' })}
        {fieldSelect('account', { description: 'Matched to your accounts by name. Rows without a match use the default account.' })}
        {fieldSelect('notes')}
      </FormGrid>

      {showSignConvention && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">What does a negative amount mean?</legend>
          <RadioGroup
            value={config.signConvention}
            onValueChange={(v) => onChange({ ...config, signConvention: v as SignConvention })}
            className="gap-2 sm:grid-cols-2"
            aria-label="Sign convention"
          >
            <RadioChoice
              id={`${baseId}-neg-exp`}
              value="negativeIsExpense"
              label="Negative = expense, positive = income"
              description="Typical for bank exports."
            />
            <RadioChoice
              id={`${baseId}-neg-inc`}
              value="negativeIsIncome"
              label="Negative = income, positive = expense"
              description="Typical for credit-card statements."
            />
          </RadioGroup>
        </fieldset>
      )}

      <FormGrid>
        <FormField label="Date format in the file" required description="Dates that do not match this format are reported as invalid rows.">
          <SelectInput<CsvDateFormat>
            value={config.dateFormat}
            onChange={(v) => onChange({ ...config, dateFormat: v })}
            options={CSV_DATE_FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label, description: o.example }))}
          />
        </FormField>
        <FormField
          label="Default account"
          required={!config.mapping.account}
          hintLabel={config.mapping.account ? '(fallback)' : undefined}
          description={
            config.mapping.account
              ? 'Used for rows whose account name does not match an existing account.'
              : 'All rows will be imported into this account.'
          }
          error={errors.defaultAccount}
        >
          <AccountSelector value={defaultAccountId} onChange={onDefaultAccountChange} placeholder="Select account" />
        </FormField>
      </FormGrid>
    </div>
  )
}

function RadioChoice({ id, value, label, description }: { id: string; value: string; label: string; description: string }) {
  return (
    <Label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="flex flex-col gap-0.5 leading-snug">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </Label>
  )
}

function truncate(value: string, max = 24): string {
  const v = value.trim()
  if (!v) return 'empty'
  return v.length > max ? `${v.slice(0, max - 1)}…` : v
}
