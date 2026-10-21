/**
 * Shared financial calculation rules.
 *
 * Every page (dashboard, monthly summary, budgets, reports, account details)
 * MUST go through these functions so numbers agree everywhere.
 *
 * Rules:
 *   - Only `posted` transactions affect balances and totals.
 *   - Income  = Σ posted `income` transactions.
 *   - Expenses = Σ posted `expense` transactions.
 *   - Transfers between the user's own accounts are EXCLUDED from income and
 *     expenses; they only move balances.
 *   - Net cash flow = income − expenses.
 *   - Refunds are modelled as `income` in the relevant expense category
 *     (they do not reduce the expense figure).
 *   - Credit accounts hold the amount OWED (positive). They are liabilities.
 *     Net worth = assets − liabilities.
 */
import { isLiabilityAccountType } from './constants'
import { isWithinRange, toMonthKey } from './dates'
import { percentChange, sumMoney } from './money'
import type {
  Account,
  AccountWithBalance,
  Category,
  DateRange,
  Id,
  MinorUnits,
  MonthKey,
  Transaction,
  TransactionType,
} from './types'

// ---------------------------------------------------------------------------
// Balance effects
// ---------------------------------------------------------------------------

/** True when the transaction currently affects balances and totals. */
export function isPosted(tx: Transaction): boolean {
  return tx.status === 'posted'
}

/**
 * Signed effect of a transaction on the *asset-style* balance of its account.
 *   income / transfer-in  → +amount
 *   expense / transfer-out → −amount
 */
export function assetDelta(tx: Transaction): MinorUnits {
  switch (tx.type) {
    case 'income':
      return tx.amount
    case 'expense':
      return -tx.amount
    case 'transfer':
      return tx.transferDirection === 'in' ? tx.amount : -tx.amount
  }
}

/**
 * Effect of a transaction on the stored balance of a given account, taking
 * account type into account. For credit accounts the balance is the amount
 * owed, so the sign is inverted (spending increases what you owe; a payment
 * transferred in decreases it).
 */
export function balanceDelta(tx: Transaction, account: Pick<Account, 'type'>): MinorUnits {
  const delta = assetDelta(tx)
  return isLiabilityAccountType(account.type) ? -delta : delta
}

export function computeAccountBalance(account: Account, transactions: Transaction[]): MinorUnits {
  let balance = account.openingBalance
  for (const tx of transactions) {
    if (tx.accountId !== account.id || !isPosted(tx)) continue
    balance += balanceDelta(tx, account)
  }
  return balance
}

export function withBalances(accounts: Account[], transactions: Transaction[]): AccountWithBalance[] {
  const byAccount = new Map<Id, Transaction[]>()
  for (const tx of transactions) {
    const list = byAccount.get(tx.accountId)
    if (list) list.push(tx)
    else byAccount.set(tx.accountId, [tx])
  }
  return accounts.map((account) => {
    const txs = byAccount.get(account.id) ?? []
    return {
      ...account,
      balance: computeAccountBalance(account, txs),
      transactionCount: txs.length,
    }
  })
}

// ---------------------------------------------------------------------------
// Net worth
// ---------------------------------------------------------------------------

export interface NetWorthSummary {
  assets: MinorUnits
  liabilities: MinorUnits
  netWorth: MinorUnits
  accountCount: number
}

/** Only active accounts contribute. Archived accounts are ignored. */
export function computeNetWorth(accounts: AccountWithBalance[]): NetWorthSummary {
  let assets = 0
  let liabilities = 0
  let accountCount = 0
  for (const a of accounts) {
    if (a.status !== 'active') continue
    accountCount++
    if (isLiabilityAccountType(a.type)) liabilities += a.balance
    else assets += a.balance
  }
  return { assets, liabilities, netWorth: assets - liabilities, accountCount }
}

// ---------------------------------------------------------------------------
// Cash flow
// ---------------------------------------------------------------------------

export interface CashFlowSummary {
  income: MinorUnits
  expenses: MinorUnits
  net: MinorUnits
  transactionCount: number
}

/** True for posted income/expense transactions (transfers excluded). */
export function isCashFlowTransaction(tx: Transaction): boolean {
  return isPosted(tx) && (tx.type === 'income' || tx.type === 'expense')
}

export function computeCashFlow(transactions: Transaction[], range?: DateRange): CashFlowSummary {
  let income = 0
  let expenses = 0
  let count = 0
  for (const tx of transactions) {
    if (!isCashFlowTransaction(tx)) continue
    if (range && !isWithinRange(tx.date, range)) continue
    count++
    if (tx.type === 'income') income += tx.amount
    else expenses += tx.amount
  }
  return { income, expenses, net: income - expenses, transactionCount: count }
}

export interface PeriodComparison {
  current: CashFlowSummary
  previous: CashFlowSummary
  incomeChangePct: number | null
  expensesChangePct: number | null
}

export function compareCashFlow(
  transactions: Transaction[],
  current: DateRange,
  previous: DateRange,
): PeriodComparison {
  const cur = computeCashFlow(transactions, current)
  const prev = computeCashFlow(transactions, previous)
  return {
    current: cur,
    previous: prev,
    incomeChangePct: percentChange(cur.income, prev.income),
    expensesChangePct: percentChange(cur.expenses, prev.expenses),
  }
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface CategoryTotal {
  categoryId: Id | null
  category: Category | null
  total: MinorUnits
  count: number
  /** Share of the grand total, 0–100. */
  share: number
}

/** Totals by category for one transaction type, sorted descending. */
export function totalsByCategory(
  transactions: Transaction[],
  categories: Category[],
  type: Exclude<TransactionType, 'transfer'>,
  range?: DateRange,
): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const totals = new Map<Id | null, { total: MinorUnits; count: number }>()
  for (const tx of transactions) {
    if (!isPosted(tx) || tx.type !== type) continue
    if (range && !isWithinRange(tx.date, range)) continue
    const cur = totals.get(tx.categoryId) ?? { total: 0, count: 0 }
    cur.total += tx.amount
    cur.count++
    totals.set(tx.categoryId, cur)
  }
  const grand = sumMoney([...totals.values()].map((t) => t.total))
  return [...totals.entries()]
    .map(([categoryId, { total, count }]) => ({
      categoryId,
      category: categoryId ? byId.get(categoryId) ?? null : null,
      total,
      count,
      share: grand === 0 ? 0 : (total / grand) * 100,
    }))
    .sort((a, b) => b.total - a.total || (a.category?.name ?? '').localeCompare(b.category?.name ?? ''))
}

export interface MonthlyPoint {
  month: MonthKey
  income: MinorUnits
  expenses: MinorUnits
  net: MinorUnits
}

/** Income/expense totals per month for the provided month keys (zero-filled). */
export function monthlySeries(transactions: Transaction[], months: MonthKey[]): MonthlyPoint[] {
  const index = new Map<MonthKey, MonthlyPoint>(
    months.map((m) => [m, { month: m, income: 0, expenses: 0, net: 0 }]),
  )
  for (const tx of transactions) {
    if (!isCashFlowTransaction(tx)) continue
    const point = index.get(toMonthKey(tx.date))
    if (!point) continue
    if (tx.type === 'income') point.income += tx.amount
    else point.expenses += tx.amount
    point.net = point.income - point.expenses
  }
  return months.map((m) => index.get(m)!)
}

export interface DailyPoint {
  date: string
  income: MinorUnits
  expenses: MinorUnits
}

/** Daily totals within a range (zero-filled for every day). */
export function dailySeries(transactions: Transaction[], range: DateRange): DailyPoint[] {
  const points = new Map<string, DailyPoint>()
  const start = new Date(`${range.start}T00:00:00`)
  const end = new Date(`${range.end}T00:00:00`)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    points.set(key, { date: key, income: 0, expenses: 0 })
  }
  for (const tx of transactions) {
    if (!isCashFlowTransaction(tx)) continue
    const p = points.get(tx.date)
    if (!p) continue
    if (tx.type === 'income') p.income += tx.amount
    else p.expenses += tx.amount
  }
  return [...points.values()]
}

/** Balance of an account at the end of each month (running total). */
export function balanceHistory(
  account: Account,
  transactions: Transaction[],
  months: MonthKey[],
): { month: MonthKey; balance: MinorUnits }[] {
  if (months.length === 0) return []
  const first = months[0]
  const own = transactions.filter((t) => t.accountId === account.id && isPosted(t))
  // Balance before the first month in the window.
  let running = account.openingBalance
  for (const tx of own) if (toMonthKey(tx.date) < first) running += balanceDelta(tx, account)
  const byMonth = new Map<MonthKey, MinorUnits>()
  for (const tx of own) {
    const m = toMonthKey(tx.date)
    if (m < first) continue
    byMonth.set(m, (byMonth.get(m) ?? 0) + balanceDelta(tx, account))
  }
  return months.map((m) => {
    running += byMonth.get(m) ?? 0
    return { month: m, balance: running }
  })
}

// ---------------------------------------------------------------------------
// Sorting helpers (deterministic)
// ---------------------------------------------------------------------------

/** Newest first, then by createdAt, then by id — so ordering is stable. */
export function sortTransactionsNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id),
  )
}
