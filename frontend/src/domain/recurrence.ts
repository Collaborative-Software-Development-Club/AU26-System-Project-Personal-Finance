/**
 * Recurrence rules.
 *
 *   - Occurrences start at `startDate` and repeat every `interval` units.
 *   - Monthly/yearly schedules keep the *anchor day* from startDate. When the
 *     target month is shorter (e.g. anchor 31 in February) the occurrence is
 *     CLAMPED to the last day of that month. The anchor day is remembered so
 *     the schedule returns to the 31st in longer months.
 *   - `nextRunDate` is the first occurrence strictly after `after` (default
 *     today) that is <= endDate. null when the schedule has ended.
 *   - The frontend only *displays* schedules. It never executes them: a rule
 *     whose nextRunDate is in the past has NOT produced a transaction unless the
 *     (future) backend worker created one.
 */
import { addCalendarUnits, parseISODate, toISODate, todayISO } from './dates'
import type { ISODate, RecurrenceFrequency, RecurringRule } from './types'

export interface ScheduleInput {
  startDate: ISODate
  endDate: ISODate | null
  frequency: RecurrenceFrequency
  interval: number
}

/** Iterate occurrences from startDate forward. Stops after `limit` to stay safe. */
export function* iterateOccurrences(rule: ScheduleInput, limit = 2000): Generator<ISODate> {
  const start = parseISODate(rule.startDate)
  if (!start) return
  const anchorDay = start.getDate()
  const interval = Math.max(1, Math.trunc(rule.interval || 1))
  let current = start
  let count = 0
  while (count++ < limit) {
    const iso = toISODate(current)
    if (rule.endDate && iso > rule.endDate) return
    yield iso
    current = addCalendarUnits(current, rule.frequency, interval, anchorDay)
  }
}

/** First occurrence strictly after `after` (or on/after when `inclusive`). */
export function computeNextRunDate(
  rule: ScheduleInput,
  after: ISODate = todayISO(),
  inclusive = true,
): ISODate | null {
  for (const occurrence of iterateOccurrences(rule)) {
    if (inclusive ? occurrence >= after : occurrence > after) return occurrence
  }
  return null
}

/** Up to `count` upcoming occurrences on/after `from`. */
export function upcomingOccurrences(rule: ScheduleInput, count: number, from: ISODate = todayISO()): ISODate[] {
  const out: ISODate[] = []
  for (const occurrence of iterateOccurrences(rule)) {
    if (occurrence < from) continue
    out.push(occurrence)
    if (out.length >= count) break
  }
  return out
}

export function describeFrequency(frequency: RecurrenceFrequency, interval: number): string {
  const n = Math.max(1, interval)
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[frequency]
  if (n === 1) {
    return { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[frequency]
  }
  return `Every ${n} ${unit}s`
}

/** Status after recomputing the schedule; `paused`/`cancelled` are preserved. */
export function refreshRuleSchedule(rule: RecurringRule, today: ISODate = todayISO()): RecurringRule {
  if (rule.status === 'cancelled' || rule.status === 'paused') return rule
  const next = computeNextRunDate(rule, today)
  if (next === null) return { ...rule, nextRunDate: null, status: 'completed' }
  return { ...rule, nextRunDate: next, status: 'active' }
}
