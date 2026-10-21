# src/pages/reports — reports and CSV export (P16)

The on-screen table and the downloaded file are the **same rows**. Never
serialise raw transactions independently of what the page displays.

## Files

| File | Role |
|---|---|
| `reports-page.tsx` | Five report types, combinable period / account / category filters, chart + table. |
| `report-model.ts` | `ReportType`, cell/row/table shapes, `cellToCsv`, `reportToCsvRows`. |
| `report-table.tsx` | Renders `ReportTableData` with money/date/percent cells. |
| `export-csv.ts` | RFC 4180 CSV builder + `downloadCsv` + `reportFileName`. |

## Report types

`income-expense` · `spending-by-category` · `income-by-category` · `cash-flow`
· `balances`. Numbers come from `domain/calculations.ts` via store selectors
(`useTransactions`, `useAccountsWithBalance`, …) — do not re-sum in the page.

## Export

Filename: `report-<type>-<start>_<end>.csv`. Money cells are plain decimals
(`toDecimalString`), dates are ISO, no currency symbol. Period is always in
the filename so two exports of different ranges cannot be confused.

This is a **frontend-only** download of the currently displayed table. It is
not a backend export job.
