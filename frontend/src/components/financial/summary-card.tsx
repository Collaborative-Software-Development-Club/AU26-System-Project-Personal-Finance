import type { ComponentType, ReactNode } from 'react'
import { TrendingDown, TrendingUp, type LucideProps } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CurrencyCode, MinorUnits } from '@/domain'
import { cn } from '@/lib/utils'
import { MoneyDisplay } from './money-display'

export interface SummaryCardProps {
  label: string
  /** Pass an amount for money values, or `value` for anything else. */
  amount?: MinorUnits
  currency?: CurrencyCode | null
  value?: ReactNode
  signed?: boolean
  /** Percentage change vs previous period; null when not computable. */
  changePct?: number | null
  changeLabel?: string
  /** When true, a positive change is good (income). When false, positive is bad (expenses). */
  positiveIsGood?: boolean
  icon?: ComponentType<LucideProps>
  footer?: ReactNode
  loading?: boolean
  className?: string
}

/** Dashboard / page summary tile. */
export function SummaryCard({
  label,
  amount,
  currency,
  value,
  signed,
  changePct,
  changeLabel = 'vs previous period',
  positiveIsGood = true,
  icon: Icon,
  footer,
  loading,
  className,
}: SummaryCardProps) {
  const hasChange = typeof changePct === 'number' && Number.isFinite(changePct)
  const good = hasChange ? (positiveIsGood ? changePct! >= 0 : changePct! <= 0) : true
  return (
    <Card size="sm" className={cn('gap-2', className)}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
          {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : amount !== undefined ? (
          <MoneyDisplay amount={amount} currency={currency} size="xl" variant={signed ? 'signed' : 'neutral'} />
        ) : (
          <div className="text-2xl font-semibold tabular sm:text-3xl">{value}</div>
        )}
        {!loading && hasChange && (
          <p className={cn('flex items-center gap-1 text-xs', good ? 'text-income' : 'text-expense')}>
            {changePct! >= 0 ? <TrendingUp className="size-3.5" aria-hidden="true" /> : <TrendingDown className="size-3.5" aria-hidden="true" />}
            <span className="tabular">
              {changePct! >= 0 ? '+' : ''}
              {changePct!.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{changeLabel}</span>
          </p>
        )}
        {!loading && !hasChange && changePct === null && <p className="text-xs text-muted-foreground">No previous data to compare</p>}
        {footer}
      </CardContent>
    </Card>
  )
}

/** Grid wrapper that lays summary cards out responsively. */
export function SummaryCardGrid({ children, className, columns = 4 }: { children: ReactNode; className?: string; columns?: 2 | 3 | 4 }) {
  return (
    <div className={cn('grid gap-4', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-3', columns === 4 && 'sm:grid-cols-2 xl:grid-cols-4', className)}>
      {children}
    </div>
  )
}
