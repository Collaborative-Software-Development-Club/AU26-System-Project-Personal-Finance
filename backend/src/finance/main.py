from typing import Annotated, Any

from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db
from finance.models import Account, Transaction

Db = Annotated[AsyncSession, Depends(get_db)]

app = FastAPI(title="Personal Finance API")


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
