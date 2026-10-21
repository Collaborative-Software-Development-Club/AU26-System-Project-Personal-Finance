import type { ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  description?: string
  disabled?: boolean
  /** Optional leading visual (icon, colour dot). */
  icon?: ReactNode
}

export interface SelectInputProps<V extends string = string> {
  id?: string
  value: V | ''
  onChange(value: V): void
  options: SelectOption<V>[]
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default'
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
  'aria-label'?: string
}

/**
 * Simple single-select over a static option list. For accounts / categories
 * use AccountSelector / CategorySelector which add balances and colours.
 */
export function SelectInput<V extends string = string>({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  className,
  size = 'default',
  ...aria
}: SelectInputProps<V>) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v as V)} disabled={disabled}>
      <SelectTrigger id={id} size={size} className={cn('w-full', className)} {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.icon}
            <span className="truncate">{opt.label}</span>
            {opt.description && <span className="ml-auto pl-2 text-xs text-muted-foreground">{opt.description}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
