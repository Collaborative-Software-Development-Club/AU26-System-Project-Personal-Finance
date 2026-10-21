# src/store — application state

Zustand v5. Two stores + selector hooks.

## `finance-store.ts` — `useFinanceStore`
Single source of truth for entities (`accounts`, `categories`, `transactions`,
`budgets`, `recurringRules`, `transfers`, `importJobs`) plus:

- `status: idle | loading | ready | error`, `error` — `AppLayout` gates pages on these.
- `pending: Record<key, true>` — in-flight operations (`useIsPending(key)`).
  Keys: `'createTransaction'`, `` `deleteAccount:${id}` ``, etc. Use them to disable buttons.
- `unresolvedOperations` — operations whose outcome is unknown; shown by
  `UnresolvedOperationsBanner`. `reconcile(key)` → `'committed' | 'not_committed'`.
- Actions mirror `FinanceApi` 1:1 and **apply the API response** (no optimistic
  writes). `createTransaction / createTransfer / runImport` take a human
  `summary` string used in the unknown-outcome banner.

Actions throw on failure. Pages wrap them with `useAsyncAction` which turns
errors into `{ status, error, fieldErrors }` and `OutcomeUnknownError` into
`status: 'unknown'`.

Balances and totals are **not stored**. Derive them.

## `settings-store.ts` — `useSettingsStore`
Persisted (`pf.settings`): displayName, defaultCurrency, dateFormat,
numberLocale, defaultDashboardPeriod, budgetWarningThreshold, simulateLatency.
Theme is handled by `src/app/theme.tsx` (key `pf.theme`), not here.

## `selectors.ts` — derived data hooks
Use these in components instead of reading raw arrays and recomputing:

| Hook | Returns |
|---|---|
| `useAccounts()` / `useCategories()` / `useTransactions()` | raw entity arrays |
| `useAccountsWithBalance()` / `useActiveAccountsWithBalance()` | accounts + derived `balance`, `transactionCount` |
| `useAccountWithBalance(id)` | one account or null |
| `useNetWorth()` | `{ assets, liabilities, netWorth, accountCount }` |
| `useAccountMap()` / `useCategoryMap()` | `Map<Id, …>` for table joins |
| `useActiveCategories(type?)` | sorted active categories, filtered for income/expense |
| `useTransactionsSorted()` | newest-first, deterministic |
| `useTransaction(id)` | one transaction or null |
| `useBudgetProgressForMonth(month)` | `BudgetProgress[]` using the settings threshold |
| `useTransactionCountByCategory()` | counts for the Categories page |
| `useIsDatasetEmpty()` | true when there are no accounts and no transactions |

Selectors that return objects/arrays built in the selector must use
`useShallow` (see existing code) to avoid render loops.

## Adding state
- New entity → extend `FinanceSnapshot` (domain), the API, the store, and
  `storage.ts` shape check.
- Page-local UI state (filters, dialogs, sort) stays in the page with `useState`
  — do not put it in the store.
