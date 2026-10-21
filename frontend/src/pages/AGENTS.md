# src/pages — route pages

One folder per feature; the router (`src/app/router.tsx`) lazy-loads each
page's **default export**. Feature-only components/hooks live next to the page
(e.g. `pages/import/column-mapper.tsx`). Anything reused by two features moves
to `src/components`.

| Folder | Pages (spec IDs) | Guide |
|---|---|---|
| `dashboard/` | Dashboard (P01) | `dashboard/AGENTS.md` |
| `accounts/` | List (P02), Details (P03), Create/Edit form (P04) | `accounts/AGENTS.md` |
| `transactions/` | List (P05), Details (P06), Create/Edit form (P07) | `transactions/AGENTS.md` |
| `transfers/` | Transfer money + transfer history (P08) | `transfers/AGENTS.md` |
| `budgets/` | List (P09), Create/Edit (P10), Details (P11) | `budgets/AGENTS.md` |
| `recurring/` | List (P12), Create/Edit (P13). No details route. | `recurring/AGENTS.md` |
| `categories/` | Categories (P14) | `categories/AGENTS.md` |
| `summary/` | Monthly Summary (P15) | `summary/AGENTS.md` |
| `reports/` | Reports + CSV export (P16) | `reports/AGENTS.md` |
| `import/` | CSV Import wizard (P17), Import History (P18) | `import/AGENTS.md` |
| `settings/` | Settings (P19) | `settings/AGENTS.md` |
| `auth/` | Login, Register (P20) — UI only, no real auth | `auth/AGENTS.md` |
| `errors/` | NotFound (P21), `RouteErrorPage`, `EntityNotFound` | `errors/AGENTS.md` |

## Page skeleton

```tsx
export default function ThingPage() {
  const navigate = useNavigate()
  const things = useThings()                       // selector hook from @/store
  usePageHeader({
    title: 'Things',
    description: 'What this page is for',
    breadcrumbs: [{ label: 'Parent', to: '/parent' }],   // omit on top-level pages
    actions: <Button asChild><Link to="/things/new"><Plus aria-hidden="true" />Add thing</Link></Button>,
  })
  if (things.length === 0) return <PageContainer><EmptyState … /></PageContainer>
  return <PageContainer>…</PageContainer>
}
```

Forms used for both create and edit take the id from `useParams()` and load
initial values from the store; if the id is missing from the store render
`<EntityNotFound entity="Account" backTo="/accounts" backLabel="Back to accounts" />`.

## Required states (spec §30)
Loading is handled globally by `AppLayout`, but **every page must still handle**:
empty dataset (helpful `EmptyState` with a next action), empty filter result
(`NoResultsState` with clear-filters), validation errors (inline, input
preserved), operation failure (`FormErrorMessage` / toast, input preserved),
outcome unknown (`OutcomeUnknownNotice` / banner, never claim success), not found.

## Filters, sorting, pagination
Keep them in page `useState` (optionally mirrored to the URL with
`useSearchParams` when deep-linking is useful — e.g. `/transactions?categoryId=…`
from the dashboard chart). Filters **combine**. Sorting goes through
`sortTransactions` for determinism. Paginate client-side (`DEFAULT_PAGE_SIZE`).

## Navigation targets other pages rely on
- `/transactions?accountId=&categoryId=&type=&start=&end=` — pre-filtered list.
- `/transactions/new?type=expense&accountId=…` — pre-filled form.
- `/transfers/new?sourceAccountId=…`.
- `/budgets/:id`, `/accounts/:id`, `/transactions/:id`.
- Recurring has no details URL; after save go to `/recurring`.
