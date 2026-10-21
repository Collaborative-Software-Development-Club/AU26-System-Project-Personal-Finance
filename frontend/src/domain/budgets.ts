/**
 * Budget rules.
 *
 *   - A budget applies to a month when startMonth <= month <= endMonth (or
 *     endMonth is null).
 *   - Spending = Σ posted `expense` transactions in the budget's category whose
 *     date falls inside the month. Transfers and income never count.
 *   - Only one budget per (category, month) is allowed. `findBudgetConflict`
 *     enforces this at form-validation time.
 *   - Status thresholds:
 *       over    → spent  > amount
 *       at      → spent === amount (and amount > 0)
 *       warning → spent >= amount * threshold
 *       under   → otherwise
 *     A zero-limit budget is `over` as soon as anything is spent, else `at`.
 */
import { DEFAULT_BUDGET_WARNING_THRESHOLD } from './constants'
import { compareMonthKeys, monthRange } from './dates'
import { isPosted } from './calculations'
import { isWithinRange } from './dates'
import type { Budget, BudgetProgress, BudgetStatus, Category, Id, MinorUnits, MonthKey, Transaction } from './types'

export function budgetAppliesToMonth(budget: Budget, month: MonthKey): boolean {
  if (compareMonthKeys(month, budget.startMonth) < 0) return false
  if (budget.endMonth && compareMonthKeys(month, budget.endMonth) > 0) return false
  return true
}

export function budgetsForMonth(budgets: Budget[], month: MonthKey): Budget[] {
  return budgets.filter((b) => budgetAppliesToMonth(b, month))
}

/** Transactions that count toward a budget in a month. */
export function budgetTransactions(budget: Budget, transactions: Transaction[], month: MonthKey): Transaction[] {
  const range = monthRange(month)
  return transactions.filter(
    (tx) =>
      isPosted(tx) &&
      tx.type === 'expense' &&
      tx.categoryId === budget.categoryId &&
      isWithinRange(tx.date, range),
  )
}

export function resolveBudgetStatus(
  spent: MinorUnits,
  amount: MinorUnits,
  threshold: number,
): BudgetStatus {
  if (amount <= 0) return spent > 0 ? 'over' : 'at'
  if (spent > amount) return 'over'
  if (spent === amount) return 'at'
  if (spent >= amount * threshold) return 'warning'
  return 'under'
}

export function computeBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
  month: MonthKey,
  defaultThreshold: number = DEFAULT_BUDGET_WARNING_THRESHOLD,
): BudgetProgress {
  const threshold = budget.warningThreshold ?? defaultThreshold
  const spent = budgetTransactions(budget, transactions, month).reduce((s, t) => s + t.amount, 0)
  const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : spent > 0 ? 100 : 0
  return {
    budget,
    month,
    spent,
    remaining: budget.amount - spent,
    percentUsed,
    status: resolveBudgetStatus(spent, budget.amount, threshold),
    threshold,
  }
}

export function computeAllBudgetProgress(
  budgets: Budget[],
  transactions: Transaction[],
  month: MonthKey,
  defaultThreshold?: number,
): BudgetProgress[] {
  return budgetsForMonth(budgets, month).map((b) =>
    computeBudgetProgress(b, transactions, month, defaultThreshold),
  )
}

export interface BudgetTotals {
  budgeted: MinorUnits
  spent: MinorUnits
  remaining: MinorUnits
  overCount: number
  warningCount: number
}

export function computeBudgetTotals(progress: BudgetProgress[]): BudgetTotals {
  let budgeted = 0
  let spent = 0
  let overCount = 0
  let warningCount = 0
  for (const p of progress) {
    budgeted += p.budget.amount
    spent += p.spent
    if (p.status === 'over') overCount++
    if (p.status === 'warning' || p.status === 'at') warningCount++
  }
  return { budgeted, spent, remaining: budgeted - spent, overCount, warningCount }
}

/**
 * Returns an existing budget whose month range overlaps the candidate range for
 * the same category, or null. Used to prevent duplicate category budgets.
 */
export function findBudgetConflict(
  budgets: Budget[],
  candidate: { id?: Id | null; categoryId: Id; startMonth: MonthKey; endMonth: MonthKey | null },
): Budget | null {
  for (const b of budgets) {
    if (candidate.id && b.id === candidate.id) continue
    if (b.categoryId !== candidate.categoryId) continue
    const aStart = b.startMonth
    const aEnd = b.endMonth ?? '9999-12'
    const cStart = candidate.startMonth
    const cEnd = candidate.endMonth ?? '9999-12'
    if (compareMonthKeys(aStart, cEnd) <= 0 && compareMonthKeys(cStart, aEnd) <= 0) return b
  }
  return null
}

export function budgetDisplayName(budget: Budget, categories: Category[]): string {
  if (budget.name) return budget.name
  return categories.find((c) => c.id === budget.categoryId)?.name ?? 'Budget'
}

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  under: 'On track',
  warning: 'Near limit',
  at: 'At limit',
  over: 'Over budget',
}
