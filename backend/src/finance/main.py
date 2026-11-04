from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from finance.api.auth import router as auth_router
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db
from finance.models import Account, Transaction

Db = Annotated[AsyncSession, Depends(get_db)]


class ChunkPayload(BaseModel):
    uploadId: str
    chunkIndex: int
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
    idempotency_key: str = Header(...),
    db: Db,
) -> dict[str, str]:
    _ = db, idempotency_key
    # TODO: check idempotency_key against DB to prevent duplicate uploads
    # TODO: persist payload.rows via ImportJob/ImportedRow models
    return {"status": "success", "message": f"Chunk {payload.chunkIndex} saved"}
