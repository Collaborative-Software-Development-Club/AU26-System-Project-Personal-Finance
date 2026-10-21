# src/pages/budgets — Budgets (P09–P11)

| File | Role |
|---|---|
| `budgets-list-page.tsx` | Progress for the selected month. Empty vs no-results. |
| `budget-form-page.tsx` | Create/edit. `validateBudget` including one-budget-per-category/month conflict. Optional name, open-ended `endMonth`, warning threshold 50–100%. |
| `budget-details-page.tsx` | Limit / spent / remaining, contributing expenses, 6-month budget-vs-actual trend. |

Spending is posted **expense** in the budget's category inside the month.
Threshold falls back to `settings.budgetWarningThreshold` (0.8).
