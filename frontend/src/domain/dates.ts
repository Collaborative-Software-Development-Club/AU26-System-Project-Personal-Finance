/**
 * Calendar-date helpers. All domain dates are ISO `YYYY-MM-DD` strings
 * interpreted in the user's local time zone. Month boundaries are therefore
 * local-calendar boundaries; there is no UTC conversion anywhere in the domain.
 */
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  getDaysInMonth,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from 'date-fns'
import type { DateFormat, DateRange, ISODate, MonthKey, ReportingPeriod } from './types'

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const MONTH_KEY_RE = /^\d{4}-\d{2}$/

export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd')
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function nowISO(): string {
  return new Date().toISOString()
}

/** Parse an ISO calendar date as *local* midnight. Returns null when invalid. */
export function parseISODate(value: string): Date | null {
  if (!ISO_DATE_RE.test(value)) return null
  const d = parse(value, 'yyyy-MM-dd', new Date())
  return isValid(d) && toISODate(d) === value ? d : null
}

export function isValidISODate(value: string): boolean {
  return parseISODate(value) !== null
}

export function toMonthKey(date: Date | ISODate): MonthKey {
  const d = typeof date === 'string' ? parseISODate(date) ?? parseISO(date) : date
  return format(d, 'yyyy-MM')
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(new Date())
}

export function isValidMonthKey(value: string): boolean {
  if (!MONTH_KEY_RE.test(value)) return false
  const d = parse(value, 'yyyy-MM', new Date())
  return isValid(d) && toMonthKey(d) === value
}

export function monthKeyToDate(month: MonthKey): Date {
  return parse(month, 'yyyy-MM', new Date())
}

export function monthRange(month: MonthKey): DateRange {
  const d = monthKeyToDate(month)
  return { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) }
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  return toMonthKey(addMonths(monthKeyToDate(month), delta))
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Inclusive list of month keys from `from` to `to`. */
export function monthKeysBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  const result: MonthKey[] = []
  let cur = from
  let guard = 0
  while (compareMonthKeys(cur, to) <= 0 && guard++ < 600) {
    result.push(cur)
    cur = shiftMonth(cur, 1)
  }
  return result
}

/** Last N month keys ending at `end` (inclusive), oldest first. */
export function lastMonthKeys(count: number, end: MonthKey = currentMonthKey()): MonthKey[] {
  const result: MonthKey[] = []
  for (let i = count - 1; i >= 0; i--) result.push(shiftMonth(end, -i))
  return result
}

export function formatMonthKey(month: MonthKey, style: 'long' | 'short' = 'long'): string {
  return format(monthKeyToDate(month), style === 'long' ? 'MMMM yyyy' : 'MMM yyyy')
}

export function formatISODate(value: ISODate, dateFormat: DateFormat = 'MMM d, yyyy'): string {
  const d = parseISODate(value)
  return d ? format(d, dateFormat) : value
}

export function formatDateTime(value: string, dateFormat: DateFormat = 'MMM d, yyyy'): string {
  const d = parseISO(value)
  return isValid(d) ? format(d, `${dateFormat} HH:mm`) : value
}

export function isWithinRange(date: ISODate, range: DateRange): boolean {
  return date >= range.start && date <= range.end
}

/** Date range for a reporting period that contains `anchor`. */
export function periodRange(period: ReportingPeriod, anchor: Date = new Date()): DateRange {
  switch (period) {
    case 'month':
      return { start: toISODate(startOfMonth(anchor)), end: toISODate(endOfMonth(anchor)) }
    case 'quarter':
      return { start: toISODate(startOfQuarter(anchor)), end: toISODate(endOfQuarter(anchor)) }
    case 'year':
      return { start: toISODate(startOfYear(anchor)), end: toISODate(endOfYear(anchor)) }
  }
}

/** The equivalent range immediately before `range` (same length in months, or days). */
export function previousRange(range: DateRange): DateRange {
  const start = parseISODate(range.start)
  const end = parseISODate(range.end)
  if (!start || !end) return range
  // If the range is whole months, shift by months; otherwise shift by day count.
  const isWholeMonths =
    start.getDate() === 1 && toISODate(endOfMonth(end)) === range.end
  if (isWholeMonths) {
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
    const prevStart = subMonths(start, months)
    const prevEnd = endOfMonth(subMonths(end, months))
    return { start: toISODate(prevStart), end: toISODate(prevEnd) }
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  return { start: toISODate(addDays(start, -days)), end: toISODate(addDays(start, -1)) }
}

/** Add `interval` units of `unit` to a date, clamping monthly/yearly to the month end. */
export function addCalendarUnits(
  date: Date,
  unit: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number,
  anchorDay: number,
): Date {
  switch (unit) {
    case 'daily':
      return addDays(date, interval)
    case 'weekly':
      return addWeeks(date, interval)
    case 'monthly': {
      const next = addMonths(startOfMonth(date), interval)
      next.setDate(Math.min(anchorDay, getDaysInMonth(next)))
      return next
    }
    case 'yearly': {
      const next = addYears(startOfMonth(date), interval)
      next.setDate(Math.min(anchorDay, getDaysInMonth(next)))
      return next
    }
  }
}

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'MMM d, yyyy', label: 'Jan 5, 2026' },
  { value: 'yyyy-MM-dd', label: '2026-01-05' },
  { value: 'MM/dd/yyyy', label: '01/05/2026' },
  { value: 'dd/MM/yyyy', label: '05/01/2026' },
]
