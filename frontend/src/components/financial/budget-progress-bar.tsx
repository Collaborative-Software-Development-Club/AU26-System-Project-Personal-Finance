import type { BudgetStatus } from '@/domain'
import { cn } from '@/lib/utils'

const TONE: Record<BudgetStatus, string> = {
  under: 'bg-primary',
  warning: 'bg-warning',
  at: 'bg-warning',
  over: 'bg-expense',
}

/**
 * Progress bar for budget usage. The bar is clamped at 100%; the percentage
 * label is not, so "132%" is readable. Threshold marker shows the warning line.
 */
export function BudgetProgressBar({
  percentUsed,
  status,
  threshold,
  label,
  size = 'md',
  className,
}: {
  percentUsed: number
  status: BudgetStatus
  /** 0–1 */
  threshold?: number
  /** Accessible name, e.g. "Food & Dining budget usage". */
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, percentUsed))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-valuetext={`${Math.round(percentUsed)}% used`}
        className={cn('relative flex-1 overflow-hidden rounded-full bg-muted', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-300', TONE[status])} style={{ width: `${clamped}%` }} />
        {threshold !== undefined && threshold > 0 && threshold < 1 && (
          <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${threshold * 100}%` }} aria-hidden="true" />
        )}
      </div>
      <span className={cn('tabular shrink-0 text-xs', status === 'over' ? 'font-semibold text-expense' : 'text-muted-foreground')}>{Math.round(percentUsed)}%</span>
    </div>
  )
}
