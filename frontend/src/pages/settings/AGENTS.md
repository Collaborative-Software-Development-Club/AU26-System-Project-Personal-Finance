# src/pages/settings — Settings (P19)

`settings-page.tsx`. Tabs: **General** (display name, default currency),
**Display** (date format, number locale, dashboard period, budget warning
threshold, theme), **Data** (reset / empty, latency toggle, failure-marker
explanation).

- Reset sample data → destructive `ConfirmDialog` → `resetToSample`.
- Start empty → `resetToEmpty`.
- Latency toggle writes `simulateLatency` on the settings store (mock API
  reads it).
- Copy must explain `[FAIL]` / `[UNKNOWN]` / `[SLOW]` and that this is mock
  behaviour, not a backend guarantee.
