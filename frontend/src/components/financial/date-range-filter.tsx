import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateInput, MonthInput } from '@/components/forms/date-input'
import { Label } from '@/components/ui/label'
import { currentMonthKey, formatMonthKey, shiftMonth, type MonthKey } from '@/domain'
import { cn } from '@/lib/utils'

export interface DateRangeValue {
  start: string
  end: string
}

/** Start / end date pair for filters. Empty strings mean "no bound". */
export function DateRangeFilter({ value, onChange, className, idPrefix = 'range' }: { value: DateRangeValue; onChange(v: DateRangeValue): void; className?: string; idPrefix?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end gap-2', className)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-start`} className="text-xs text-muted-foreground">
          From
        </Label>
        <DateInput id={`${idPrefix}-start`} value={value.start} onChange={(start) => onChange({ ...value, start })} max={value.end || undefined} className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-end`} className="text-xs text-muted-foreground">
          To
        </Label>
        <DateInput id={`${idPrefix}-end`} value={value.end} onChange={(end) => onChange({ ...value, end })} min={value.start || undefined} className="w-40" />
      </div>
    </div>
  )
}

/** Month navigator (‹ Month YYYY ›) with a native month input for jumping. */
export function MonthPicker({ value, onChange, className, maxMonth, id = 'month-picker' }: { value: MonthKey; onChange(m: MonthKey): void; className?: string; maxMonth?: MonthKey; id?: string }) {
  const max = maxMonth ?? shiftMonth(currentMonthKey(), 12)
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button variant="outline" size="icon" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
        <ChevronLeft aria-hidden="true" />
      </Button>
      <div className="relative">
        <MonthInput id={id} aria-label="Selected month" value={value} onChange={(m) => m && onChange(m)} max={max} className="w-44 text-center" />
      </div>
      <Button variant="outline" size="icon" onClick={() => onChange(shiftMonth(value, 1))} disabled={value >= max} aria-label="Next month">
        <ChevronRight aria-hidden="true" />
      </Button>
      <span className="sr-only" aria-live="polite">
        Showing {formatMonthKey(value)}
      </span>
    </div>
  )
}
