# Personal Finance Backend

Backend API for a personal finance application built as a learning project for backend systems, databases, concurrency, and reliable data handling.

## Setup
Environments:
Copy setup backend/.env using backend/.env.example.
**See Migration Setup Below**

Running API:
uv run uvicorn finance.main:app --reload

## Tech Stack

- **Python 3.13** — Main programming language.
- **FastAPI** — Web framework for building the REST API and handling HTTP requests/responses.
- **Uvicorn** — ASGI server used to run the FastAPI application.
- **PostgreSQL** — Relational database for storing accounts, transactions, budgets, etc.
- **SQLAlchemy** — ORM and database toolkit used to interact with PostgreSQL from Python.
- **asyncpg** — Async PostgreSQL driver used by SQLAlchemy.
- **Alembic** — Handles database schema migrations.
- **Pydantic** — Validates API request and response data.
- **Docker** — Runs PostgreSQL in a container for local development.
- **uv** — Manages Python versions, dependencies, virtual environments, and project commands.
- **pytest** — Testing framework.
- **Ruff** — Python linting and formatting.
- **mypy** — Static type checking.

## Project Structure

```text
backend/
├── src/
│   └── finance/
│       ├── api/             # FastAPI routes and HTTP endpoints.
│       ├── core/            # Application configuration and shared functionality.
│       ├── db/              # Database engine, sessions, and SQLAlchemy setup.
│       ├── models/          # SQLAlchemy models representing database tables.
│       ├── schemas/         # Pydantic schemas for API request/response validation.
│       ├── repositories/    # Database queries and data access logic.
│       ├── services/        # Application business logic and rules.
│       └── workers/         # Background and scheduled jobs.
│
├── tests/
│   ├── unit/                # Tests for individual pieces of application logic.
│   ├── integration/         # Tests for multiple components working together.
│   └── concurrency/         # Tests for race conditions and simultaneous operations.
│
├── .python-version          # Python version used by the project.
├── pyproject.toml           # Project metadata and dependency configuration.
├── uv.lock                  # Locked Python dependency versions.
└── README.md                # Backend documentation.


Workflow:

Client
  ↓
FastAPI → API Routes
  ↓
Services → Business Logic
  ↓
Repositories → Database Operations
  ↓
SQLAlchemy → asyncpg
  ↓
PostgreSQL
```

## Migration and Database Setup

Running Docker (from repo root):
docker compose up -d

Database migrations (from `backend/`):
uv run alembic upgrade head -m "message"

Create a new migration after changing models in `src/finance/models/`:
uv run alembic revision --autogenerate -m "describe change"

Running API:
uv run uvicorn finance.main:app --reload
