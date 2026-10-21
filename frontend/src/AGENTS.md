# frontend/src — agent guide

React 19 + TypeScript + Vite frontend for the Personal Finance project. Runs
entirely on mock data today; designed so the mock can be swapped for the
FastAPI backend without redesigning pages. Specification:
`frontend/frontend-design-doc.md`. Human-facing overview: `frontend/README.md`.

## Layout

| Folder | Purpose | Guide |
|---|---|---|
| `domain/` | Types, money, dates, calculation rules, validation. Pure, no React. | `domain/AGENTS.md` |
| `data/` | Seeded sample dataset and the demo user. | `data/AGENTS.md` |
| `api/` | `FinanceApi` interface + mock implementation (localStorage, latency, failure simulation). | `api/AGENTS.md` |
| `store/` | Zustand stores (finance entities, settings) and derived-data selector hooks. | `store/AGENTS.md` |
| `hooks/` | Cross-cutting hooks: `useFormatters`, `useAsyncAction`, `useDocumentTitle`, `useMediaQuery`. | `hooks/AGENTS.md` |
| `components/ui/` | shadcn/ui primitives (generated; edit sparingly). | — |
| `components/layout`, `financial`, `forms`, `feedback` | Shared app components. | `components/AGENTS.md` |
| `pages/<feature>/` | Route pages, one folder per feature. Feature-only components live beside the page. | `pages/AGENTS.md` |
| `app/` | Router, providers, in-house theme. | `app/AGENTS.md` |

Import with the `@/` alias (`@/domain`, `@/store`, `@/components/...`).

## Non-negotiable conventions

1. **Money is integer minor units** (`MinorUnits`, cents). Parse user input
   with `parseMoney`, display with `useFormatters().money` / `<MoneyDisplay>`.
   Never do arithmetic on floats or format with `toFixed`.
2. **Dates are ISO strings** (`YYYY-MM-DD`, months `YYYY-MM`). Use `domain/dates.ts`.
3. **All numbers come from `domain/calculations.ts` + `domain/budgets.ts`** via
   the selector hooks in `store/selectors.ts`. Don't re-implement sums in pages.
4. **Transfers are not income or expenses.** They move balances only.
5. **Credit accounts hold the amount owed** (positive = liability).
   Net worth = assets − liabilities. See `domain/AGENTS.md`.
6. **Every data page handles**: loading (skeleton), empty dataset, empty
   filter result (distinct message + clear filters), validation errors
   (inline), operation failure (preserve input), outcome unknown (never claim
   success/failure), not found (`EntityNotFound`).
7. **Status is never colour-only**: badges include icon + text.
8. **Mutations**: call store actions (never `api` directly from pages); wrap in
   `useAsyncAction`; disable submit while pending via `FormActions`; toast on
   success with `toast` from `@/components/feedback`.
9. **Destructive actions** go through `ConfirmDialog`.
10. **Declare the header** with `usePageHeader({ title, description, breadcrumbs, actions })`
    once per page; wrap content in `<PageContainer>`.
11. No emojis as icons; use `lucide-react` **named imports**
    (`import { Plus } from 'lucide-react'`). Decorative icons get `aria-hidden`.
    Do not import `lucide-react/dist/...` by hand — `vite.config.ts` rewrites
    named imports to per-icon files so Vite 8 does not hang pre-bundling the
    1800-icon barrel.

## Commands (run in `frontend/`)

```
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

## What is explicitly NOT the frontend's job

Authentication, authorization, idempotency enforcement, concurrency control,
atomic transfers, duplicate detection across imports, scheduled execution of
recurring rules. The UI *simulates* and *communicates* these; the backend owns
them. Don't present mock behaviour as a guarantee in copy or docs.
