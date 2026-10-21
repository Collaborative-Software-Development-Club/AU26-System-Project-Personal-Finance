# src/app — router, providers, theme

| File | Role |
|---|---|
| `router.tsx` | `createBrowserRouter`. Lazy pages (default export). `AppLayout` for the shell; `AuthLayout` for `/login` and `/register`. Unknown paths → `NotFoundPage`. Route errors → `RouteErrorPage`. **Do not add routes here when implementing a page that already has a path** — keep the same filenames and default exports. |
| `providers.tsx` | `ThemeProvider` + `TooltipProvider` + `AppToaster`. |
| `theme.tsx` | In-house light/dark/system provider. Key `pf.theme`. `index.html` has a no-flash script. Do not reintroduce `next-themes` (it logged a React 19 `<script>` error). |

The `@/` alias is configured in `vite.config.ts` (`import.meta.url`, not
`__dirname` — Vite 8's native config loader rejects `baseUrl` / `__dirname`).
`lucide-react` named imports are rewritten there so the optimizer does not
pre-bundle the full icon barrel.
