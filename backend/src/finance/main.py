from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal
import secrets
from typing import Annotated, Any

from finance.api.dependencies import get_current_user
from finance.models.user import User
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from finance.api.auth import router as auth_router
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from finance.core.logging import setup_logging
from finance.db.session import get_db
from finance.models import Account, Transaction

Db = Annotated[AsyncSession, Depends(get_db)]

CurrentUser = Annotated[User, Depends(get_current_user)]


class ChunkPayload(BaseModel):
    upload_id: str
    chunk_index: int
    rows: list[dict[str, Any]]


class NewTransaction(BaseModel):
    account_id: int
    amount: Decimal
    description: str
    category: str
    transaction_date: date


def txn_to_dict(t: Transaction) -> dict[str, Any]:
    return {
        "id": t.id,
        "account_id": t.account_id,
        "amount": t.amount,
        "description": t.description,
        "category": t.category,
        "transaction_date": t.transaction_date,
    }


async def get_owned_account(
    db: AsyncSession,
    user: User,
    account_id: int,
) -> Account:
    account = await db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(404, "Account not found")
    return account


@asynccontextmanager
async def lifespan(_app: FastAPI):
    setup_logging()
    yield


app = FastAPI(title="Personal Finance API", lifespan=lifespan)

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
async def list_accounts(
    db: Db,
    user: CurrentUser,
) -> list[dict[str, Any]]:
    rows = await db.scalars(
        select(Account).where(Account.user_id == user.id)
    )
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
async def list_transactions(
    db: Db,
    user: CurrentUser,
) -> list[dict[str, Any]]:
    statement = (
        select(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .where(Account.user_id == user.id)
    )

    rows = await db.scalars(statement)
    return [txn_to_dict(t) for t in rows]


@app.get("/accounts/{account_id}/transactions")
async def account_transactions(
    account_id: int,
    db: Db,
    user: CurrentUser,
) -> list[dict[str, Any]]:
    await get_owned_account(db, user, account_id)
    rows = await db.scalars(
        select(Transaction)
        .where(Transaction.account_id == account_id)
        .order_by(Transaction.transaction_date.desc())
    )
    return [txn_to_dict(t) for t in rows]


@app.post("/transactions", status_code=201)
async def create_transaction(
    body: NewTransaction,
    db: Db,
    user: CurrentUser,
    idempotency_key: str | None = Header(default=None),
) -> dict[str, Any]:
    account = await get_owned_account(db, user, body.account_id)

    txn = Transaction(
        **body.model_dump(),
        idempotency_key=idempotency_key or secrets.token_urlsafe(16),
    )
    db.add(txn)
    account.balance += body.amount
    await db.commit()
    await db.refresh(txn)
    return txn_to_dict(txn)


@app.delete("/transactions/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: int,
    db: Db,
    user: CurrentUser,
) -> None:
    txn = await db.get(Transaction, txn_id)
    if txn is None:
        raise HTTPException(404, "Transaction not found")

    account = await db.get(Account, txn.account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(404, "Transaction not found")

    account.balance -= txn.amount
    await db.delete(txn)
    await db.commit()


@app.post("/upload")
async def upload_file(
    payload: ChunkPayload,
    db: Db,
    user: CurrentUser,
    idempotency_key: str = Header(...),
) -> dict[str, str]:
    _ = db, user, idempotency_key
    # TODO: check idempotency_key against DB to prevent duplicate uploads
    # TODO: persist payload.rows via ImportJob/ImportedRow models
    return {"status": "success", "message": f"Chunk {payload.chunk_index} saved"}
