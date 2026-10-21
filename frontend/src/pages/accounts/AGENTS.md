# src/pages/accounts — Accounts (P02–P04)

| File | Role |
|---|---|
| `accounts-list-page.tsx` | Active/archived accounts with derived balances. Archive vs delete. |
| `account-details-page.tsx` | Balance, type, transactions for that account (search + sort). |
| `account-form-page.tsx` | Create and edit (`useParams().id`). Currency locked once the account has transactions. |

Credit accounts show amount owed (positive). An account with transactions
cannot be hard-deleted — archive instead (`conflict` from the API).
