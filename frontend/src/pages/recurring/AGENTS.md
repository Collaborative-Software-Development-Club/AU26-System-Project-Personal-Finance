# src/pages/recurring — recurring rules (P12, P13)

Rules describe **intent**, not execution. Copy on both pages must say that
saving or reaching a next-run date does **not** create a transaction. The
backend will own scheduling.

## Files

| File | Role |
|---|---|
| `recurring-list-page.tsx` | Filter by status, pause/resume, cancel (confirm), delete (confirm), upcoming copy. |
| `recurring-form-page.tsx` | Create/edit via `useParams().id`. Live occurrence preview. |

There is no details route; after save, navigate to `/recurring`.

## Behaviour

- Status changes go through `setRecurringRuleStatus`. Cancelled rules cannot
  be resumed (`conflict`). Pause/resume is a toggle on active/paused only.
- Monthly/yearly schedules keep the anchor day of `startDate`; shorter months
  clamp to the last day (`domain/recurrence.ts`). The form explains this when
  the start day is 29–31.
- Preview uses `upcomingOccurrences` — display only. Prefill create from
  query params (`type`, `accountId`, `categoryId`, `amount`, `description`,
  `startDate`, `frequency`).
- Validation: `validateRecurring`. Amount > 0; end ≥ start; interval 1–365;
  account and category must match the chosen type.
- `[FAIL]` / `[SLOW]` in the description work; `[UNKNOWN]` does **not** (no
  idempotency key on recurring writes).
