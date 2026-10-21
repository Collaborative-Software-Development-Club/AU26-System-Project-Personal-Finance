/**
 * Report table model shared by the on-screen table and the CSV export so
 * both always show exactly the same rows.
 */
import { toDecimalString, type CurrencyCode, type ISODate, type MinorUnits, type MonthKey } from '@/domain'

export type ReportType = 'income-expense' | 'spending-by-category' | 'income-by-category' | 'cash-flow' | 'balances'

export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'income-expense', label: 'Income vs expenses', description: 'Monthly income, expenses and net cash flow.' },
  { value: 'spending-by-category', label: 'Spending by category', description: 'Where expenses went in the selected period.' },
  { value: 'income-by-category', label: 'Income by category', description: 'Where income came from in the selected period.' },
  { value: 'cash-flow', label: 'Net cash flow trend', description: 'Income minus expenses, month by month.' },
  { value: 'balances', label: 'Account balances over time', description: 'End-of-month balance for one account.' },
]

export type ReportCell =
  | { kind: 'text'; value: string }
  | { kind: 'month'; month: MonthKey }
  | { kind: 'date'; date: ISODate }
  | { kind: 'money'; amount: MinorUnits; currency?: CurrencyCode | null; signed?: boolean }
  /** `null` renders as "—" (not computable). `signed` prefixes "+" for positives. */
  | { kind: 'percent'; value: number | null; signed?: boolean }
  | { kind: 'count'; value: number }

export interface ReportColumn {
  header: string
  align?: 'left' | 'right'
}

export interface ReportRow {
  key: string
  cells: ReportCell[]
}

export interface ReportTableData {
  columns: ReportColumn[]
  rows: ReportRow[]
  /** Optional totals row (same length as `columns`). */
  totals?: ReportCell[]
}

/**
 * CSV value for a cell: plain decimals for money (no symbol, no grouping),
 * ISO dates and month keys, integers for counts/percentages.
 */
export function cellToCsv(cell: ReportCell, defaultCurrency: CurrencyCode): string {
  switch (cell.kind) {
    case 'text':
      return cell.value
    case 'month':
      return cell.month
    case 'date':
      return cell.date
    case 'money':
      return toDecimalString(cell.amount, cell.currency ?? defaultCurrency)
    case 'percent':
      return cell.value === null ? '' : String(Math.round(cell.value))
    case 'count':
      return String(cell.value)
  }
}

export function reportToCsvRows(data: ReportTableData, defaultCurrency: CurrencyCode): { header: string[]; rows: string[][] } {
  const header = data.columns.map((c) => c.header)
  const rows = data.rows.map((r) => r.cells.map((c) => cellToCsv(c, defaultCurrency)))
  if (data.totals) rows.push(data.totals.map((c) => cellToCsv(c, defaultCurrency)))
  return { header, rows }
}
