/**
 * Derived data hooks. Components should use these instead of re-implementing
 * joins and calculations, so every page agrees on the numbers.
 */
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  computeAllBudgetProgress,
  computeNetWorth,
  sortTransactionsNewestFirst,
  withBalances,
  type Account,
  type AccountWithBalance,
  type BudgetProgress,
  type Category,
  type Id,
  type MonthKey,
  type Transaction,
} from '@/domain'
import { useFinanceStore } from './finance-store'
import { useSettingsStore } from './settings-store'

export function useAccounts(): Account[] {
  return useFinanceStore((s) => s.accounts)
}

export function useCategories(): Category[] {
  return useFinanceStore((s) => s.categories)
}

export function useTransactions(): Transaction[] {
  return useFinanceStore((s) => s.transactions)
}

/** All accounts with derived balances (archived included). */
export function useAccountsWithBalance(): AccountWithBalance[] {
  const { accounts, transactions } = useFinanceStore(
    useShallow((s) => ({ accounts: s.accounts, transactions: s.transactions })),
  )
  return useMemo(() => withBalances(accounts, transactions), [accounts, transactions])
}

export function useActiveAccountsWithBalance(): AccountWithBalance[] {
  const all = useAccountsWithBalance()
  return useMemo(() => all.filter((a) => a.status === 'active'), [all])
}

export function useAccountWithBalance(id: Id | null | undefined): AccountWithBalance | null {
  const all = useAccountsWithBalance()
  return useMemo(() => (id ? all.find((a) => a.id === id) ?? null : null), [all, id])
}

export function useNetWorth() {
  const accounts = useAccountsWithBalance()
  return useMemo(() => computeNetWorth(accounts), [accounts])
}

export function useAccountMap(): Map<Id, Account> {
  const accounts = useAccounts()
  return useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
}

export function useCategoryMap(): Map<Id, Category> {
  const categories = useCategories()
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
}

export function useActiveCategories(type?: 'income' | 'expense'): Category[] {
  const categories = useCategories()
  return useMemo(
    () =>
      categories
        .filter((c) => c.status === 'active' && (!type || c.type === 'both' || c.type === type))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, type],
  )
}

/** Transactions sorted newest-first (stable). */
export function useTransactionsSorted(): Transaction[] {
  const transactions = useTransactions()
  return useMemo(() => sortTransactionsNewestFirst(transactions), [transactions])
}

export function useTransaction(id: Id | null | undefined): Transaction | null {
  return useFinanceStore((s) => (id ? s.transactions.find((t) => t.id === id) ?? null : null))
}

export function useBudgetProgressForMonth(month: MonthKey): BudgetProgress[] {
  const { budgets, transactions } = useFinanceStore(
    useShallow((s) => ({ budgets: s.budgets, transactions: s.transactions })),
  )
  const threshold = useSettingsStore((s) => s.budgetWarningThreshold)
  return useMemo(
    () =>
      computeAllBudgetProgress(budgets, transactions, month, threshold).sort(
        (a, b) => b.percentUsed - a.percentUsed,
      ),
    [budgets, transactions, month, threshold],
  )
}

export function useTransactionCountByCategory(): Map<Id, number> {
  const transactions = useTransactions()
  return useMemo(() => {
    const counts = new Map<Id, number>()
    for (const t of transactions) if (t.categoryId) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
    return counts
  }, [transactions])
}

/** Is the dataset entirely empty (no accounts and no transactions)? */
export function useIsDatasetEmpty(): boolean {
  return useFinanceStore((s) => s.accounts.length === 0 && s.transactions.length === 0)
}
