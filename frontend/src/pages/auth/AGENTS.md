# src/pages/auth — Login / Register (P20)

UI only. No session, no token, no route guard. `AuthLayout` (no sidebar).

| File | Role |
|---|---|
| `login-page.tsx` | Pre-filled with `DEMO_USER.email` / `DEMO_PASSWORD`. Submit → `/dashboard`. Labelled as non-secure demo. |
| `register-page.tsx` | Same: valid form navigates to `/dashboard`. Does not create a user. |

Logout in the user menu navigates to `/login`. Real authentication is a
backend job.
