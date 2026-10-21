# src/pages/import — CSV import wizard (P17) and history (P18)

Feature-only helpers live beside the pages. The store action is
`runImport(input, summary)`; pages never call `api` directly.

## Files

| File | Role |
|---|---|
| `csv-import-page.tsx` | Wizard: upload → preview → map columns → validate → review → result. |
| `import-history-page.tsx` | Past `ImportJob`s from the mock snapshot, expandable row issues. |
| `csv-import-logic.ts` | Pure helpers: file checks, papaparse, auto-detect, mapping, row validation, in-file duplicates. |
| `csv-dropzone.tsx` | File picker / drag-and-drop. |
| `csv-preview-table.tsx` | First rows of the parsed file. |
| `column-mapper.tsx` | Map CSV headers to date / description / amount / type / account / category. |
| `import-validation-summary.tsx` | Counts of valid / invalid / duplicate rows before commit. |
| `import-result-summary.tsx` | Outcome of `runImport` (`completed` / `partial` / `failed` / `unknown`). |

## Rules

- Client-side validation is **pre-flight only**. Duplicate detection looks
  inside the current file. Cross-import duplicates, atomic insert and retry
  safety belong to the backend.
- File limits come from `CSV_MAX_FILE_BYTES` / `CSV_ACCEPTED_TYPES` in
  `domain/constants.ts`. Put `[FAIL]` / `[UNKNOWN]` / `[SLOW]` in the **file
  name** (or a mapped description) to exercise mock failure markers.
- `runImport` takes a client-generated idempotency key (via the store). On
  `unknown` outcome show `OutcomeUnknownNotice` and offer Check status; never
  claim the rows were saved.
- Default account is required so rows without an account column still import.
