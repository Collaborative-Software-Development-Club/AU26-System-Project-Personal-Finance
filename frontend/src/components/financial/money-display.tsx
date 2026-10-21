import type { CurrencyCode, MinorUnits, TransactionType, TransferDirection } from '@/domain'
import { useFormatters } from '@/hooks/use-formatters'
import { cn } from '@/lib/utils'

export interface MoneyDisplayProps {
  amount: MinorUnits
  currency?: CurrencyCode | null
  /**
   * 'neutral' → plain; 'signed' → +/− with income/expense colour based on sign;
   * 'type' → colour and sign from a transaction type.
   */
  variant?: 'neutral' | 'signed' | 'type'
  type?: TransactionType
  transferDirection?: TransferDirection | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  compact?: boolean
  className?: string
}

const SIZE = { sm: 'text-sm', md: 'text-base', lg: 'text-xl font-semibold', xl: 'text-2xl font-semibold sm:text-3xl' }

/**
 * The only way to render money in the UI. Always tabular, currency-aware,
 * and never communicates direction by colour alone (sign is included).
 */
export function MoneyDisplay({ amount, currency, variant = 'neutral', type, transferDirection, size = 'md', compact, className }: MoneyDisplayProps) {
  const fmt = useFormatters()

  let text: string
  let tone = ''
  if (variant === 'type' && type) {
    const outgoing = type === 'expense' || (type === 'transfer' && transferDirection === 'out')
    const incoming = type === 'income' || (type === 'transfer' && transferDirection === 'in')
    const signed = outgoing ? -Math.abs(amount) : Math.abs(amount)
    text = fmt.money(signed, currency, { signDisplay: 'exceptZero', compact })
    tone = type === 'transfer' ? 'text-transfer' : incoming ? 'text-income' : 'text-expense'
  } else if (variant === 'signed') {
    text = fmt.money(amount, currency, { signDisplay: 'exceptZero', compact })
    tone = amount > 0 ? 'text-income' : amount < 0 ? 'text-expense' : ''
  } else {
    text = fmt.money(amount, currency, { compact })
  }

  return <span className={cn('tabular whitespace-nowrap', SIZE[size], tone, className)}>{text}</span>
}
