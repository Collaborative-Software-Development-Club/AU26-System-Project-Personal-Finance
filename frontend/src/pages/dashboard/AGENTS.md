# src/pages/dashboard — Dashboard (P01)

`dashboard-page.tsx`. Period from `settings.defaultDashboardPeriod` (month /
quarter / year). Numbers from selectors + `domain/calculations.ts` /
`domain/budgets.ts`.

- Four summary cards: **Net worth** (assets + liabilities underneath), income,
  expenses, remaining budget for the period.
- `IncomeExpenseChart` (last 6 months), recent transactions
  (`DASHBOARD_RECENT_TRANSACTIONS`), budget overview, `CategoryBreakdownChart`
  with `onSelect` → `/transactions?categoryId=…`.
- Welcome `EmptyState` when `useIsDatasetEmpty()`.
