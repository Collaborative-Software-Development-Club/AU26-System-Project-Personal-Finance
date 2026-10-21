# src/pages/transfers — Transfers (P08)

`transfers-page.tsx` is both `/transfers` and `/transfers/new` (query
`sourceAccountId`). Form + confirm dialog + history table.

- One logical operation, two legs. Legs are not editable individually.
- Insufficient funds on a non-credit source → `conflict`. Credit accounts may
  be source (cash advance) or destination (payment).
- `[UNKNOWN]` in the description: status `'unknown'` → `OutcomeUnknownNotice`.
  The unresolved-operations banner offers Check status (`reconcile`).
- Cross-currency transfers are rejected.
