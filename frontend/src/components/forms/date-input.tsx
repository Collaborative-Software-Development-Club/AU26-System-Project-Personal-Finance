import { forwardRef, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface DateInputProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> {
  /** ISO `YYYY-MM-DD` or ''. */
  value: string
  onChange(value: string): void
}

/** Native date picker. Value is always an ISO calendar date string. */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput({ value, onChange, className, ...props }, ref) {
  return <Input ref={ref} type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cn('tabular', className)} {...props} />
})

export interface MonthInputProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> {
  /** `YYYY-MM` or ''. */
  value: string
  onChange(value: string): void
}

/** Native month picker. Value is a `YYYY-MM` month key. */
export const MonthInput = forwardRef<HTMLInputElement, MonthInputProps>(function MonthInput({ value, onChange, className, ...props }, ref) {
  return <Input ref={ref} type="month" value={value} onChange={(e) => onChange(e.target.value)} className={cn('tabular', className)} {...props} />
})
