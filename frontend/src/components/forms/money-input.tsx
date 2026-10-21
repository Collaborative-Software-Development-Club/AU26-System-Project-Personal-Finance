import { forwardRef, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { CURRENCIES, type CurrencyCode } from '@/domain'
import { cn } from '@/lib/utils'

export interface MoneyInputProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> {
  /** Raw text value, e.g. "12.50". Parse with `parseMoney` on submit. */
  value: string
  onChange(value: string): void
  currency: CurrencyCode
}

/**
 * Text input for monetary amounts. Keeps the raw string so the user can type
 * freely; validation happens with `parseMoney` (integer minor units). Uses
 * inputMode="decimal" for a numeric keypad on mobile.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, currency, className, ...props },
  ref,
) {
  const info = CURRENCIES[currency]
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground" aria-hidden="true">
        {info.symbol}
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={info.decimals === 0 ? '0' : `0.${'0'.repeat(info.decimals)}`}
        className={cn('tabular pl-8 pr-12', className)}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs font-medium text-muted-foreground" aria-hidden="true">
        {currency}
      </span>
    </div>
  )
})
