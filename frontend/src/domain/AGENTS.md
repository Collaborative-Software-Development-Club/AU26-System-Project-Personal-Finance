# src/domain — domain model and calculation rules

Pure TypeScript. No React, no store, no API. Everything the UI needs to agree
on numbers lives here so the dashboard, budgets, monthly summary and reports
can never disagree.

## Files

| File | Contents |
|---|---|
| `types.ts` | Entity shapes (`Account`, `Transaction`, `Category`, `Budget`, `RecurringRule`, `Transfer`, `ImportJob`, `UserSettings`, `FinanceSnapshot`). |
| `constants.ts` | Labels, option lists, defaults, policies (`TRANSFER_BLOCK_OVERDRAFT`, `DEFAULT_BUDGET_WARNING_THRESHOLD = 0.8`, CSV limits). |
| `money.ts` | `parseMoney`, `formatMoney`, `toDecimalString`, `sumMoney`, `percentChange`, `CURRENCIES`. |
| `dates.ts` | ISO date/month helpers, `monthRange`, `lastMonthKeys`, `periodRange`, `previousRange`, `addCalendarUnits`. |
| `calculations.ts` | Balance deltas, `withBalances`, `computeNetWorth`, `computeCashFlow`, `totalsByCategory`, `monthlySeries`, `dailySeries`, `balanceHistory`, deterministic sort. |
| `budgets.ts` | Budget applicability, progress, status thresholds, duplicate detection, totals. |
| `recurrence.ts` | Occurrence iteration, `computeNextRunDate`, `upcomingOccurrences`, `describeFrequency`. |
| `validation.ts` | Form validators returning `{ field: message }` maps (`AccountFormValues`, `TransactionFormValues`, `BudgetFormValues`, `RecurringFormValues`, …). Shared by create and edit. |
| `ids.ts` | `createId(prefix)`. |

## Domain model (decisions)

### Money
- Stored as **integer minor units** (`MinorUnits`). USD → cents. `CURRENCIES[code].decimals` gives precision (JPY = 0).
- `Transaction.amount` is a **magnitude** (> 0). Direction comes from `type`.
- Only `formatMoney` converts to a float, for display.
- Single currency per account. Cross-currency transfers are rejected.

### Accounts
- `openingBalance` is stored; the **current balance is derived**:
  `openingBalance + Σ balanceDelta(posted transactions)`.
- Account types: `checking | savings | cash | credit | other`.
- **Credit accounts are liabilities.** Their balance is the amount owed
  (positive). Expense on a card → balance up; payment transferred in → balance down.
  `balanceDelta()` inverts the sign for liability accounts.
- Net worth summary (`computeNetWorth`): `assets` = Σ non-credit active balances,
  `liabilities` = Σ credit active balances, `netWorth = assets − liabilities`.
  Archived accounts are excluded.
- Accounts with transactions cannot be hard-deleted; archive instead.

### Transactions
- `type`: `income | expense | transfer`. `status`: only `posted` counts toward balances/totals.
- `source`: `manual | recurring | import | transfer` (for traceability and UI hints).
- Transfer legs: two transactions with `type: 'transfer'`, same `transferId`,
  `transferDirection: 'out' | 'in'`, `categoryId: null`. They are **excluded** from
  income/expense totals and cannot be edited individually (delete the transfer).
- Refunds are recorded as `income` in the relevant category — they do not
  reduce the expense total.

### Cash flow
- Income = Σ posted income; Expenses = Σ posted expense; Net = Income − Expenses.
- Month boundaries are local calendar months (no UTC conversion).

### Budgets
- `period: 'monthly'`; applies when `startMonth ≤ month ≤ endMonth` (endMonth null = open-ended).
- Spending = posted **expense** transactions in the budget's category inside the month.
- **One budget per category per month** (`findBudgetConflict`). Enforced in validation and the mock API.
- Status: `over` (spent > amount) · `at` (spent = amount) · `warning` (spent ≥ amount × threshold) · `under`.
  Threshold = `budget.warningThreshold ?? settings.budgetWarningThreshold (0.8)`.
- Zero-limit budget: `over` if anything is spent, else `at`. Percent is uncapped;
  progress bars clamp visually.

### Recurring rules
- `frequency` daily/weekly/monthly/yearly with `interval ≥ 1`.
- Monthly/yearly keep the **anchor day** of `startDate`; shorter months **clamp
  to the last day** and return to the anchor in longer months (31 → Feb 28 → Mar 31).
- `nextRunDate` = first occurrence ≥ today and ≤ endDate; `null` ⇒ `completed`.
- Rules describe *intent*. The frontend never creates transactions from them;
  a past `nextRunDate` does not mean anything executed.

### Transfers
- One logical operation (`Transfer`) + two legs. Status `completed | pending | failed | unknown`.
- Policy: non-credit source accounts cannot be overdrawn (`TRANSFER_BLOCK_OVERDRAFT`).
  Credit accounts may be source (cash advance) or destination (payment).
- `unknown` is a first-class state: the UI shows "outcome unknown" and offers reconciliation.

### Validation
- Validators take raw string form values and return `Partial<Record<field, string>>`.
- Trim text; enforce `NAME_MAX_LENGTH` (200) / `DESCRIPTION_MAX_LENGTH` (500) to match the backend models.
- Category names are unique case-insensitively.

## Adding a rule
Put it here, export from `index.ts`, and consume it through a selector in
`store/selectors.ts`. Never compute totals inline in a component.
