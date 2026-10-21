import { useMemo } from 'react'
import { ACCOUNT_TYPE_LABEL, type Id } from '@/domain'
import { useFormatters } from '@/hooks/use-formatters'
import { useAccountsWithBalance, useActiveCategories } from '@/store/selectors'
import { SelectInput, type SelectOption } from '@/components/forms/select-input'
import { ColorDot } from './badges'

export interface EntitySelectorProps {
  id?: string
  value: Id | ''
  onChange(id: Id): void
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default'
  /** Prepend an "All" option with this label (for filters). Value is ''. */
  allLabel?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
  'aria-label'?: string
}

const ALL = '__all__'

/** Account picker showing type and current balance. Archived accounts are excluded unless `includeArchived`. */
export function AccountSelector({ includeArchived = false, excludeId, allLabel, value, onChange, ...props }: EntitySelectorProps & { includeArchived?: boolean; excludeId?: Id | null }) {
  const accounts = useAccountsWithBalance()
  const fmt = useFormatters()
  const options = useMemo<SelectOption[]>(() => {
    const list = accounts
      .filter((a) => (includeArchived || a.status === 'active') && a.id !== excludeId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({
        value: a.id,
        label: a.name,
        description: `${ACCOUNT_TYPE_LABEL[a.type]} · ${fmt.money(a.balance, a.currency)}`,
        icon: <ColorDot color={a.color} />,
      }))
    return allLabel ? [{ value: ALL, label: allLabel }, ...list] : list
  }, [accounts, includeArchived, excludeId, allLabel, fmt])
  return (
    <SelectInput
      {...props}
      value={allLabel && value === '' ? ALL : value}
      onChange={(v) => onChange(v === ALL ? '' : v)}
      options={options}
      placeholder={props.placeholder ?? 'Select account'}
    />
  )
}

/** Category picker filtered by transaction type (income/expense). */
export function CategorySelector({ type, allLabel, value, onChange, ...props }: EntitySelectorProps & { type?: 'income' | 'expense' }) {
  const categories = useActiveCategories(type)
  const options = useMemo<SelectOption[]>(() => {
    const list = categories.map((c) => ({ value: c.id, label: c.name, icon: <ColorDot color={c.color} /> }))
    return allLabel ? [{ value: ALL, label: allLabel }, ...list] : list
  }, [categories, allLabel])
  return (
    <SelectInput
      {...props}
      value={allLabel && value === '' ? ALL : value}
      onChange={(v) => onChange(v === ALL ? '' : v)}
      options={options}
      placeholder={props.placeholder ?? 'Select category'}
    />
  )
}
