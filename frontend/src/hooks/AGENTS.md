# src/hooks — cross-cutting hooks

| Hook | Role |
|---|---|
| `useFormatters()` | Settings-aware `money`, `signedMoney`, `date`, `month`, `percent`, `number`. Use this instead of calling `formatMoney` in components. |
| `useAsyncAction(fn)` | idle → pending → success \| error \| unknown. Maps `ApiError` to `fieldErrors`, `OutcomeUnknownError` to `status: 'unknown'`. Ignores double-submit while pending. |
| `useDocumentTitle(title)` | Sets `document.title` (auth pages; `AppLayout` uses the page header title). |
| `useMediaQuery(query)` | CSS media query boolean (sidebar vs mobile nav). |

Pages should not add more global hooks here unless two features need them.
Feature-only helpers stay next to the page.
