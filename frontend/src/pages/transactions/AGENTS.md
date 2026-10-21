# src/pages/transactions — Transactions (P05–P07)

| File | Role |
|---|---|
| `transactions-list-page.tsx` | Combinable filters mirrored to `useSearchParams` (`accountId`, `categoryId`, `type`, `start`, `end`, `q`). `sortTransactions`, client pagination (`DEFAULT_PAGE_SIZE`). Distinguish empty dataset vs `NoResultsState`. |
| `transaction-details-page.tsx` | One posted row. Transfer legs explain they cannot be edited; delete goes through the transfer confirm. |
| `transaction-form-page.tsx` | Create/edit income or expense. Transfer type is not offered here. Prefill from query params. |
| `delete-transaction-dialog.tsx` | Confirm delete; transfer legs route to "delete transfer" copy. |
| `transaction-links.ts` | `duplicateTransactionUrl` for income/expense only. |

Pages never call `api` directly. `[FAIL]` / `[UNKNOWN]` / `[SLOW]` in the
description exercise mock failures (`[UNKNOWN]` only on **create**).
