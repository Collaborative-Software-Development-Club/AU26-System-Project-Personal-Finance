# src/data — sample dataset and demo user

| File | Role |
|---|---|
| `seed.ts` | Deterministic 6-month sample snapshot (accounts, categories, transactions, budgets, recurring rules, transfers, import jobs). Dates are relative to "today"; amounts for a given calendar day are identical across reloads (seeded PRNG). |
| `demo-user.ts` | `DEMO_USER` + `DEMO_PASSWORD`. Pre-filled on Login. **Not a security boundary** — there is no auth. |

Corrupt or missing `pf.mock-db` reseeds from `seed.ts` (`api/mock/storage.ts`).
Settings → Data can `resetToSample` or `resetToEmpty`.
