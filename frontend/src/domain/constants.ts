import type {
  AccountType,
  CurrencyCode,
  RecurrenceFrequency,
  RecurringRuleStatus,
  ReportingPeriod,
  TransactionType,
  TransferStatus,
  ImportJobStatus,
  UserSettings,
} from './types'

export const APP_NAME = 'Ledger'
export const APP_TAGLINE = 'Personal Finance'

export const DEFAULT_CURRENCY: CurrencyCode = 'USD'

/** Budgets warn at 80% usage unless the budget overrides it. */
export const DEFAULT_BUDGET_WARNING_THRESHOLD = 0.8

/** How many rows the dashboard "Recent transactions" panel shows. */
export const DASHBOARD_RECENT_TRANSACTIONS = 8

/** Default rows per page for tables. */
export const DEFAULT_PAGE_SIZE = 25

/** CSV import limits (frontend-only; the backend will define the real ones). */
export const CSV_MAX_FILE_BYTES = 2 * 1024 * 1024
export const CSV_PREVIEW_ROWS = 10
export const CSV_ACCEPTED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain']

/**
 * Transfer policy: asset accounts (anything but credit) may not be driven
 * below zero by a transfer. Credit accounts can always be a source (cash
 * advance) or destination (payment).
 */
export const TRANSFER_BLOCK_OVERDRAFT = true

export const ACCOUNT_TYPES: { value: AccountType; label: string; description: string; liability: boolean }[] = [
  { value: 'checking', label: 'Checking', description: 'Everyday spending account', liability: false },
  { value: 'savings', label: 'Savings', description: 'Money set aside', liability: false },
  { value: 'cash', label: 'Cash', description: 'Physical cash on hand', liability: false },
  { value: 'credit', label: 'Credit card', description: 'Balance represents money owed', liability: true },
  { value: 'other', label: 'Other', description: 'Anything else', liability: false },
]

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.value, t.label]),
) as Record<AccountType, string>

export function isLiabilityAccountType(type: AccountType): boolean {
  return type === 'credit'
}

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
]

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
}

export const FREQUENCIES: { value: RecurrenceFrequency; label: string; unit: string }[] = [
  { value: 'daily', label: 'Daily', unit: 'day' },
  { value: 'weekly', label: 'Weekly', unit: 'week' },
  { value: 'monthly', label: 'Monthly', unit: 'month' },
  { value: 'yearly', label: 'Yearly', unit: 'year' },
]

export const RECURRING_STATUS_LABEL: Record<RecurringRuleStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  unknown: 'Outcome unknown',
}

export const IMPORT_STATUS_LABEL: Record<ImportJobStatus, string> = {
  completed: 'Completed',
  partial: 'Partially completed',
  failed: 'Failed',
  unknown: 'Outcome unknown',
}

export const REPORTING_PERIODS: { value: ReportingPeriod; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
]

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: 'Demo User',
  defaultCurrency: DEFAULT_CURRENCY,
  dateFormat: 'MMM d, yyyy',
  numberLocale: 'en-US',
  defaultDashboardPeriod: 'month',
  budgetWarningThreshold: DEFAULT_BUDGET_WARNING_THRESHOLD,
  simulateLatency: true,
}

/** Palette offered in account/category colour pickers. */
export const COLOR_SWATCHES = [
  '#1e40af', '#0ea5e9', '#059669', '#16a34a', '#ca8a04', '#ea580c',
  '#dc2626', '#db2777', '#7c3aed', '#6366f1', '#64748b', '#0f766e',
] as const

export const NAME_MAX_LENGTH = 200
export const DESCRIPTION_MAX_LENGTH = 500
