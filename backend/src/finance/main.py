from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from finance.api.auth import router as auth_router
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db
from finance.models import Account, Transaction, ImportJob, ImportedRow

from datetime import date
from decimal import Decimal, InvalidOperation

Db = Annotated[AsyncSession, Depends(get_db)]


class ChunkPayload(BaseModel):
    upload_id: str
    chunk_index: int
    filename: str
    rows: list[dict[str, Any]]


app = FastAPI(title="Personal Finance API")

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/accounts")
async def list_accounts(db: Db) -> list[dict[str, Any]]:
    rows = await db.scalars(select(Account))
    return [
        {
            "id": a.id,
            "name": a.name,
            "account_type": a.account_type,
            "balance": a.balance,
        }
        for a in rows
    ]


@app.get("/transactions")
async def list_transactions(db: Db) -> list[dict[str, Any]]:
    rows = await db.scalars(select(Transaction))
    return [
        {
            "id": t.id,
            "account_id": t.account_id,
            "amount": t.amount,
            "description": t.description,
            "category": t.category,
            "transaction_date": t.transaction_date,
        }
        for t in rows
    ]


@app.post("/upload")
async def upload_file(
    payload: ChunkPayload,
    db: Db,
    idempotency_key: str = Header(...),
) -> dict[str, str]:
    _ = db, idempotency_key
    # TODO: check idempotency_key against DB to prevent duplicate uploads
    existing = await db.scalar(select(ImportJob).where(ImportJob.idempotency_key == idempotency_key))
    if existing:
        return {"error": "pending", "message": "Duplicate upload detected"}
    
    # TODO: persist payload.rows via ImportJob/ImportedRow models
    job = ImportJob(
        user_id=1,  # TODO: replace with actual user ID from auth
        idempotency_key=idempotency_key,
        filename=f"{payload.filename}",
        total_rows=len(payload.rows),
        failed_rows=0,
    )

    db.add(job)

    #Process each row
    for row_index, row_data in enumerate(payload.rows, start=1):
        raw_date = str(row_data.get("date") or "").strip()
        raw_amount = str(row_data.get("amount") or "").strip()
        raw_description = str(row_data.get("description") or "").strip()
        raw_category = row_data.get("category")

        try:
            if not raw_date or not raw_amount or not raw_description:
                raise ValueError("date, amount, and description are required")

            parsed_date = date.fromisoformat(raw_date)
            parsed_amount = Decimal(raw_amount)

            status = "raw"
            error_message = None
        except (ValueError, InvalidOperation) as exc:
            parsed_date = None
            parsed_amount = None
            status = "failed"
            job.failed_rows += 1
            error_message = str(exc)

        imported_row = ImportedRow(
            job=job,
            raw_date=raw_date,
            raw_amount=raw_amount,
            raw_description=raw_description,
            raw_category=str(raw_category) if raw_category not in (None, "") else None,
            parsed_date=parsed_date,
            parsed_amount=parsed_amount,
            account_id=row_data.get("account_id"),
            category=None,
            row_index=row_index,
            status=status,
            error_message=error_message,
        )

        db.add(imported_row)

    job.status = "completed" if job.failed_rows == 0 else "partial"
    job.imported_rows = job.total_rows - job.failed_rows

    await db.commit()

    return {"status": "success", "message": f"Chunk {payload.chunk_index} saved"}
