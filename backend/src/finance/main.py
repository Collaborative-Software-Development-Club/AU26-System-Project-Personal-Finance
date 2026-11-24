from contextlib import asynccontextmanager
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
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
from finance.models import Account, Transaction, ImportJob, ImportedRow

from datetime import date, datetime
from decimal import Decimal, InvalidOperation

Db = Annotated[AsyncSession, Depends(get_db)]

CurrentUser = Annotated[User, Depends(get_current_user)]


class ChunkPayload(BaseModel):
    upload_id: str
    chunk_index: int
    filename: str
    rows: list[dict[str, Any]]


class NewAccount(BaseModel):
    name: str
    account_type: str
    balance: Decimal = Decimal("0")


class NewTransaction(BaseModel):
    account_id: int
    amount: Decimal
    description: str
    category: str
    transaction_date: date


def account_to_dict(a: Account) -> dict[str, Any]:
    return {
        "id": a.id,
        "name": a.name,
        "account_type": a.account_type,
        "balance": a.balance,
    }


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
    # returns everything account row: id, name, account_type, balance
    return [account_to_dict(a) for a in rows]


@app.post("/accounts", status_code=201)
async def create_account(
    body: NewAccount,
    db: Db,
    user: CurrentUser,
) -> dict[str, Any]:
    account = Account(
        **body.model_dump(),
        user_id=user.id,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account_to_dict(account)


@app.delete("/accounts/{account_id}", status_code=204)
async def delete_account(
    account_id: int,
    db: Db,
    user: CurrentUser,
) -> None:
    account = await get_owned_account(db, user, account_id)

    has_transactions = await db.scalar(
        select(Transaction.id).where(Transaction.account_id == account.id).limit(1)
    )
    if has_transactions is not None:
        raise HTTPException(409, "Account has transactions")

    await db.delete(account)
    await db.commit()


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
) -> dict[str, Any]:
    existing = await db.scalar(select(ImportJob).where(ImportJob.idempotency_key == idempotency_key))
    if existing:
        return {
            "id": existing.id,
            "status": existing.status,
            "message": "This import was already saved.",
            "filename": existing.filename,
            "total_rows": existing.total_rows,
            "imported_rows": existing.imported_rows,
            "failed_rows": existing.failed_rows,
            "duplicate_rows": existing.duplicate_rows,
            "errors": [],
        }

    job = ImportJob(
        user_id=user.id,
        idempotency_key=idempotency_key,
        filename=f"{payload.filename}",
        total_rows=len(payload.rows),
        failed_rows=0,
    )

    db.add(job)
    await db.flush()

    row_errors: list[dict[str, Any]] = []

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

            # Add transaction row to database if all fields are valid
            transaction_key = f"{idempotency_key}:{row_index}"

            # Create transaction input object
            TransactionInput = Transaction(
                idempotency_key=transaction_key,
                account_id=row_data.get("account_id"),
                amount=parsed_amount,
                description=raw_description,
                category=raw_category,
                transaction_date=parsed_date,
                created_at=datetime.now()
            )

            existing_transaction = await db.scalar(select(Transaction).where(Transaction.idempotency_key == transaction_key))
            if existing_transaction:
                job.duplicate_rows += 1
                status = "duplicate"
            else:
                db.add(TransactionInput)
                await db.flush()

        except (ValueError, InvalidOperation) as exc:
            parsed_date = None
            parsed_amount = None
            status = "failed"
            job.failed_rows += 1
            error_message = str(exc)
            row_errors.append({"row": row_index, "field": None, "message": str(exc)})

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
    job.imported_rows = job.total_rows - job.failed_rows - job.duplicate_rows
    job_id = job.id
    filename = job.filename
    total_rows = job.total_rows
    imported_rows = job.imported_rows
    failed_rows = job.failed_rows
    duplicate_rows = job.duplicate_rows
    status = job.status

    await db.commit()

    return {
        "id": job_id,
        "status": status,
        "message": f"Imported {imported_rows} of {total_rows} rows",
        "filename": filename,
        "total_rows": total_rows,
        "imported_rows": imported_rows,
        "failed_rows": failed_rows,
        "duplicate_rows": duplicate_rows,
        "errors": row_errors,
    }
