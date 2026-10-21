# Personal Finance

Learning project for backend systems, with a React frontend that talks to the
backend **only through an API**. The two sides are separate folders; the UI
runs today against an in-browser mock so pages can be built before FastAPI is
wired up.

| Folder | Role | Docs |
|---|---|---|
| [`frontend/`](./frontend) | React 19 + Vite SPA. All 21 spec pages, mock data in `localStorage`. | [`frontend/README.md`](./frontend/README.md), [`frontend/src/AGENTS.md`](./frontend/src/AGENTS.md) |
| [`backend/`](./backend) | FastAPI + PostgreSQL. Auth, persistence, concurrency, scheduled jobs. | [`backend/README.md`](./backend/README.md) |

Specification for the UI: [`frontend/frontend-design-doc.md`](./frontend/frontend-design-doc.md).

## Quick start (frontend, mock mode)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

No backend or environment variables are required. Data lives in the browser
under `pf.mock-db`. When the API exists, swap `MockFinanceApi` for an HTTP
adapter — see [Connecting the real backend](./frontend/README.md#connecting-the-real-backend).

## Quick start (backend)

See [`backend/README.md`](./backend/README.md): Docker for PostgreSQL, `uv`,
Alembic, `uvicorn`.
