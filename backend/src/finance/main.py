from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db
from finance.models import Account, Transaction

Db = Annotated[AsyncSession, Depends(get_db)]


class ChunkPayload(BaseModel):
    upload_id: str
    chunk_index: int
    rows: list[dict[str, Any]]


app = FastAPI(title="Personal Finance API")

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
):
    #TODO Check for idempotency key in database(do not upload repeated data)
    #TODO Process the uploaded file data here
    return {"status": "success", "message": f"Chunk {payload.chunk_index} saved"}
