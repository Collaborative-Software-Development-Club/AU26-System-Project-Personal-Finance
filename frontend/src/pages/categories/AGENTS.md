# src/pages/categories — Categories (P14)

| File | Role |
|---|---|
| `categories-page.tsx` | Income / expense / both. Archive, delete, usage counts. |
| `category-form-dialog.tsx` | Create and edit. Names unique case-insensitively. |

Delete of a category that is in use requires a reassignment picker
(`deleteCategory(id, reassignTo)`). The API rejects delete without reassignment
when transactions, budgets or rules still point at it.
