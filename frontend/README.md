# Personal Finance — Frontend

React single-page application for the Personal Finance project. It implements
all 21 pages of [`frontend-design-doc.md`](./frontend-design-doc.md) against a
**mock, in-browser data layer** so the UI can be built and exercised before the
FastAPI backend in [`../backend`](../backend/README.md) exposes its API. The
data boundary is a single TypeScript interface; swapping the mock for HTTP is a
one-line change (see [Connecting the real backend](#connecting-the-real-backend)).

## Tech stack

| Area | Choice |
|---|---|
| Framework | React 19, TypeScript 6, Vite 8 |
| Routing | react-router 7 (data router, lazy-loaded pages) |
| State | Zustand 5 (`store/`), derived data via selector hooks |
| Styling | Tailwind CSS v4 + shadcn/ui (`radix-nova` preset, `radix-ui` primitives), `lucide-react` icons, Geist font, `cn` for class merging |
| Charts | Recharts 3 |
| CSV parsing | papaparse |
| Dates | date-fns + ISO helpers in `domain/dates.ts` |
| Lint / types | ESLint 10 (typescript-eslint, react-hooks incl. React Compiler rules), `tsc` |

Requirements: Node 22+, npm 10+.

Theme is an in-house provider in `src/app/theme.tsx` (not `next-themes`),
persisted as `pf.theme`. `index.html` applies the class before paint to avoid a flash.

## Setup and scripts

```bash
cd frontend
npm install
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # tsc -b && vite build  → dist/
npm run preview    # serve the production build
npm run lint       # eslint .
```

No environment variables are needed for the mock data layer.

If `npm run dev` sits on `[optimizer] bundling dependencies…` for minutes, see
[Dev server hang](#dev-server-hang-vite--lucide-react).

## Using the app (mock mode)

- The app opens on `/dashboard` with a **deterministic sample dataset** (6
  months of activity across checking, savings, cash and credit-card accounts).
  Amounts for a given calendar day are identical across reloads (`src/data/seed.ts`).
- Data persists in `localStorage` under the versioned key `pf.mock-db`. UI
  preferences are under `pf.settings`, the theme under `pf.theme`.
- **Settings → Data** lets you reset to the sample dataset, start with an empty
  dataset, and toggle simulated network latency (about 250–500 ms when on).
- `/login` and `/register` are UI-only. The login form is pre-filled with the
  demo user (`src/data/demo-user.ts`) and simply navigates to the dashboard.
  There is no session and no access control.

### Routes (P01–P21)

| Path | Page |
|---|---|
| `/dashboard` | Dashboard |
| `/accounts`, `/accounts/new`, `/accounts/:id`, `/accounts/:id/edit` | Accounts |
| `/transactions`, `/transactions/new`, `/transactions/:id`, `/transactions/:id/edit` | Transactions |
| `/transfers`, `/transfers/new` | Transfers (form + history) |
| `/budgets`, `/budgets/new`, `/budgets/:id`, `/budgets/:id/edit` | Budgets |
| `/recurring`, `/recurring/new`, `/recurring/:id/edit` | Recurring rules (no details route) |
| `/categories` | Categories |
| `/summary` | Monthly summary |
| `/reports` | Reports + CSV download of the on-screen table |
| `/import`, `/import/history` | CSV import wizard and history |
| `/settings` | General / Display / Data |
| `/login`, `/register` | Auth UI only (no sidebar) |
| unknown path | Not found |

Deep links: `/transactions?accountId=&categoryId=&type=&start=&end=`,
`/transactions/new?type=expense&accountId=…`, `/transfers/new?sourceAccountId=…`.

### Deterministic failure markers

Put one of these in a description, name, memo, or CSV **file name**:

| Marker | Effect | Where it applies |
|---|---|---|
| `[FAIL]` | Rejected (`unavailable`); nothing is saved. Input is preserved. | Any mutation that checks the text field |
| `[UNKNOWN]` | **Committed**, then the response is "lost". UI shows *Outcome unknown*; the banner offers **Check status**. | Money-moving creates only: `createTransaction`, `createTransfer`, `runImport` |
| `[SLOW]` | ~3 s latency on that request. | Same fields as `[FAIL]` |

Failure markers are deterministic. Simulated latency, when enabled, uses a
250–500 ms range (not a fixed delay).

## Architecture

```
src/
├─ domain/      Pure TS: entity types, money (integer minor units), ISO dates,
│               calculation rules, budgets, recurrence, validation.
├─ data/        Seeded sample dataset + demo user.
├─ api/         FinanceApi interface (types.ts) and the mock implementation
│               (localStorage persistence, latency and failure simulation).
├─ store/       Zustand stores (entities, settings), pending-operation keys,
│               unresolved-operation reconciliation, selector hooks.
├─ hooks/       useFormatters, useAsyncAction, useDocumentTitle, useMediaQuery.
├─ components/  ui/ (shadcn), layout/, financial/, forms/, feedback/.
├─ pages/       One folder per feature (P01–P21); feature-only components live
│               beside their page.
└─ app/         Router, providers, in-house theme.
```

Data flow: **page → store action → `api` → store applies the server's response
→ selectors derive balances/totals → page renders**. Pages never call the API
directly and never store derived numbers.

Each folder has an `AGENTS.md` that documents its conventions. Read them
before changing code in that folder:

| Guide | Covers |
|---|---|
| [`src/AGENTS.md`](./src/AGENTS.md) | Layout, non-negotiable conventions, what is *not* the frontend's job |
| [`src/domain/AGENTS.md`](./src/domain/AGENTS.md) | Domain model and calculation rules |
| [`src/data/AGENTS.md`](./src/data/AGENTS.md) | Seeded dataset and demo user |
| [`src/api/AGENTS.md`](./src/api/AGENTS.md) | `FinanceApi` contract, idempotency, mock behaviour, failure markers |
| [`src/store/AGENTS.md`](./src/store/AGENTS.md) | Stores, pending keys, unresolved operations, selector hooks |
| [`src/hooks/AGENTS.md`](./src/hooks/AGENTS.md) | Cross-cutting hooks |
| [`src/components/AGENTS.md`](./src/components/AGENTS.md) | Shared component catalogue and the canonical form pattern |
| [`src/app/AGENTS.md`](./src/app/AGENTS.md) | Router, providers, theme |
| [`src/pages/AGENTS.md`](./src/pages/AGENTS.md) | Page skeleton, required UI states, URL query-param conventions |
| [`src/pages/dashboard/AGENTS.md`](./src/pages/dashboard/AGENTS.md) | Dashboard cards, period, empty welcome |
| [`src/pages/accounts/AGENTS.md`](./src/pages/accounts/AGENTS.md) | Account list, details, create/edit |
| [`src/pages/transactions/AGENTS.md`](./src/pages/transactions/AGENTS.md) | List filters, details, form, transfer-leg delete |
| [`src/pages/transfers/AGENTS.md`](./src/pages/transfers/AGENTS.md) | Transfer form, confirm, history, unknown outcome |
| [`src/pages/budgets/AGENTS.md`](./src/pages/budgets/AGENTS.md) | List, form (`validateBudget`), details + trend |
| [`src/pages/recurring/AGENTS.md`](./src/pages/recurring/AGENTS.md) | Intent vs execution, pause/cancel, occurrence preview |
| [`src/pages/categories/AGENTS.md`](./src/pages/categories/AGENTS.md) | Create/edit dialog, reassignment on delete |
| [`src/pages/summary/AGENTS.md`](./src/pages/summary/AGENTS.md) | Monthly summary |
| [`src/pages/reports/AGENTS.md`](./src/pages/reports/AGENTS.md) | Report types and CSV export |
| [`src/pages/import/AGENTS.md`](./src/pages/import/AGENTS.md) | CSV import wizard internals |
| [`src/pages/settings/AGENTS.md`](./src/pages/settings/AGENTS.md) | General / Display / Data, reset mock data |
| [`src/pages/auth/AGENTS.md`](./src/pages/auth/AGENTS.md) | Login/register UI only |
| [`src/pages/errors/AGENTS.md`](./src/pages/errors/AGENTS.md) | Not found, route error, entity not found |

## Key decisions

These were settled up front and are binding for further work:

- **Money is stored as integer minor units** (cents). The only float conversion
  is in `formatMoney` for display. The backend uses `Numeric(20,2)`; the HTTP
  adapter will convert.
- **Credit accounts are liabilities.** Their balance is the amount owed
  (positive). The UI shows **Total assets, Total liabilities and Net worth** as
  three separate figures; net worth = assets − liabilities.
- **Transfers are not income or expenses.** They are one logical operation with
  two legs; legs cannot be edited individually.
- **Balances and totals are always derived** from posted transactions in
  `domain/calculations.ts`; nothing is cached in state or storage.
- **One budget per category per month**, enforced in validation and in the API.
- **Recurring rules describe intent.** The frontend never creates transactions
  from them; the backend will own scheduling.
- **Reliability is a UI concern too.** Money-moving creates carry a client-generated
  idempotency key; "outcome unknown" is a first-class state with reconciliation,
  and submit buttons are disabled while an operation is pending.
- **Every data page handles** loading, empty dataset, empty filter result,
  validation errors, operation failure (input preserved), outcome unknown, and
  not found.
- **Scope**: all 21 pages including the Could-haves (Import History, Login/Register).
- **No mock login gate** — a demo user is pre-filled; the app is always "logged in".
- **Design system**: Minimal/Swiss dashboard style validated with the
  UI/UX Pro Max skill; palette built around trust blue `#1e40af` with semantic
  income/expense/warning tokens and a derived light mode. Font: **Geist**
  (installed by the shadcn preset; the skill suggested IBM Plex Sans — Geist was
  kept deliberately). Status is never communicated by colour alone.

## Connecting the real backend

1. Create `src/api/http/http-api.ts` implementing `FinanceApi` from
   `src/api/types.ts` with `fetch` against the FastAPI routes.
2. Map the wire format: decimals ↔ minor units (`parseMoney` / `toDecimalString`),
   category names ↔ ids, snake_case ↔ camelCase.
3. Translate HTTP errors into `ApiError` codes (`validation | conflict |
   not_found | unavailable | unknown_outcome`); throw `OutcomeUnknownError`
   with the idempotency key on timeouts / network failures after a write was sent.
4. Change the export in `src/api/index.ts` from `MockFinanceApi` to the HTTP
   adapter. Pages and the store do not change.

The backend must own what the mock only simulates: authentication,
idempotency enforcement, atomic transfers, concurrency control, cross-import
duplicate detection and scheduled execution of recurring rules.

## Project conventions in one minute

- Import with the `@/` alias.
- Money → `MoneyDisplay` / `useFormatters().money`; dates → `domain/dates.ts`.
- Mutations → store action wrapped in `useAsyncAction`; toast on success.
- Destructive actions → `ConfirmDialog`.
- Icons → named imports from `lucide-react` (a Vite plugin rewrites them to
  per-icon files; do not import the dist path by hand).
- New shadcn primitives → `npx shadcn@latest add <name> --yes` (do not hand-write).
- Lint rules from the React Compiler plugin are errors: no `setState` directly
  inside effects, no ref mutation during render. Zustand selectors that build
  objects/arrays use `useShallow`.

## Dev server hang (Vite + lucide-react)

`lucide-react`'s package entry re-exports every icon (`import * as icons from
'./icons/index.mjs'`). Vite 8's Rolldown optimizer will try to pre-bundle
~1800 modules and can sit on `[optimizer] bundling dependencies…` for minutes.
`vite.config.ts` rewrites named `lucide-react` imports to individual icon
files and excludes the barrel from `optimizeDeps`. Keep importing as
`import { Plus } from 'lucide-react'`.

Clearing `node_modules/.vite` forces a cold optimize; that is not required
for this fix and will only slow the next start.
