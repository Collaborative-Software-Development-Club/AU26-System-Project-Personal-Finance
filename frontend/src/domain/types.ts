/**
 * Frontend domain model.
 *
 * These are the shapes the UI works with. They are intentionally close to what
 * the backend API is expected to return, but they are NOT the database schema.
 * Conventions:
 *   - Ids are opaque strings.
 *   - Money is stored as integer minor units (e.g. cents) — see `money.ts`.
 *   - Dates are ISO calendar dates (`YYYY-MM-DD`); timestamps are ISO 8601 strings.
 *   - Optional fields are present and `null` (never `undefined`) so objects
 *     serialise consistently.
 */

export type Id = string

/** Integer amount in the currency's minor unit (cents for USD). Always >= 0 for transactions. */
export type MinorUnits = number

/** `YYYY-MM-DD` */
export type ISODate = string
/** `YYYY-MM` */
export type MonthKey = string
/** Full ISO 8601 timestamp */
export type ISODateTime = string

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY'

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'other'
export type AccountStatus = 'active' | 'archived'

export interface Account {
  id: Id
  name: string
  type: AccountType
  currency: CurrencyCode
  /**
   * Balance at account creation. The current balance is DERIVED:
   *   current = openingBalance + Σ(posted balance deltas of this account's transactions)
   * For `credit` accounts the balance is the amount OWED (a liability): a
   * positive value reduces net worth. For every other type it is an asset.
   */
  openingBalance: MinorUnits
  status: AccountStatus
  description: string | null
  color: string | null
  createdAt: ISODateTime
}

/** An account enriched with its derived current balance. */
export interface AccountWithBalance extends Account {
  balance: MinorUnits
  transactionCount: number
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CategoryType = 'income' | 'expense' | 'both'
export type CategoryStatus = 'active' | 'archived'

export interface Category {
  id: Id
  name: string
  type: CategoryType
  color: string
  icon: string | null
  status: CategoryStatus
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionSource = 'manual' | 'recurring' | 'import' | 'transfer'
/**
 * `posted` affects balances. `pending` and `failed` never do.
 * The mock only produces `posted`; the states exist so the UI is ready for
 * backend-provided statuses.
 */
export type TransactionStatus = 'posted' | 'pending' | 'failed'
export type TransferDirection = 'out' | 'in'

export interface Transaction {
  id: Id
  description: string
  type: TransactionType
  /** Magnitude, always > 0. Direction comes from `type` (+ `transferDirection`). */
  amount: MinorUnits
  currency: CurrencyCode
  accountId: Id
  /** Required for income/expense; always null for transfers. */
  categoryId: Id | null
  date: ISODate
  notes: string | null
  source: TransactionSource
  status: TransactionStatus
  /** Set when `type === 'transfer'`. Both legs share the same transferId. */
  transferId: Id | null
  transferDirection: TransferDirection | null
  recurringRuleId: Id | null
  importId: Id | null
  createdAt: ISODateTime
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export type BudgetPeriod = 'monthly'

export interface Budget {
  id: Id
  /** Optional display name; falls back to the category name. */
  name: string | null
  categoryId: Id
  amount: MinorUnits
  currency: CurrencyCode
  period: BudgetPeriod
  /** First month the budget applies to (inclusive). */
  startMonth: MonthKey
  /** Last month the budget applies to (inclusive), or null for open-ended. */
  endMonth: MonthKey | null
  /** Fraction 0–1 at which the budget shows a warning. null → app default. */
  warningThreshold: number | null
  createdAt: ISODateTime
}

export type BudgetStatus = 'under' | 'warning' | 'at' | 'over'

export interface BudgetProgress {
  budget: Budget
  month: MonthKey
  spent: MinorUnits
  /** amount - spent; negative when over budget. */
  remaining: MinorUnits
  /** 0–∞, not capped. Display code should clamp for progress bars. */
  percentUsed: number
  status: BudgetStatus
  threshold: number
}

// ---------------------------------------------------------------------------
// Recurring rules
// ---------------------------------------------------------------------------

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RecurringRuleStatus = 'active' | 'paused' | 'completed' | 'cancelled'

export interface RecurringRule {
  id: Id
  description: string
  type: Exclude<TransactionType, 'transfer'>
  amount: MinorUnits
  currency: CurrencyCode
  accountId: Id
  categoryId: Id
  frequency: RecurrenceFrequency
  /** Every N frequency units (e.g. every 2 weeks). >= 1 */
  interval: number
  startDate: ISODate
  endDate: ISODate | null
  /** Next date a transaction is *scheduled* for. null when completed/cancelled. */
  nextRunDate: ISODate | null
  status: RecurringRuleStatus
  notes: string | null
  createdAt: ISODateTime
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

/**
 * `unknown` means the client never learned whether the operation committed.
 * The UI must not present it as success or failure until reconciled.
 */
export type TransferStatus = 'completed' | 'pending' | 'failed' | 'unknown'

export interface Transfer {
  id: Id
  sourceAccountId: Id
  destinationAccountId: Id
  amount: MinorUnits
  currency: CurrencyCode
  date: ISODate
  description: string | null
  status: TransferStatus
  createdAt: ISODateTime
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export type ImportJobStatus = 'completed' | 'partial' | 'failed' | 'unknown'

export interface ImportRowError {
  /** 1-based row number in the source file (excluding the header). */
  row: number
  field: string | null
  message: string
}

export interface ImportJob {
  id: Id
  fileName: string
  createdAt: ISODateTime
  accountId: Id | null
  totalRows: number
  successfulRows: number
  failedRows: number
  skippedRows: number
  status: ImportJobStatus
  errors: ImportRowError[]
}

// ---------------------------------------------------------------------------
// User / settings
// ---------------------------------------------------------------------------

export interface User {
  id: Id
  name: string
  email: string
  createdAt: ISODateTime
}

export type DateFormat = 'MMM d, yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy'
export type ReportingPeriod = 'month' | 'quarter' | 'year'

export interface UserSettings {
  displayName: string
  defaultCurrency: CurrencyCode
  dateFormat: DateFormat
  /** BCP 47 locale used for number formatting. */
  numberLocale: string
  defaultDashboardPeriod: ReportingPeriod
  /** Fraction 0–1 used when a budget has no explicit threshold. */
  budgetWarningThreshold: number
  /** Add artificial latency to mock API calls. */
  simulateLatency: boolean
}

// ---------------------------------------------------------------------------
// Snapshot of all financial entities (what the mock API returns on load)
// ---------------------------------------------------------------------------

export interface FinanceSnapshot {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
  recurringRules: RecurringRule[]
  transfers: Transfer[]
  importJobs: ImportJob[]
}

export interface DateRange {
  start: ISODate
  end: ISODate
}
