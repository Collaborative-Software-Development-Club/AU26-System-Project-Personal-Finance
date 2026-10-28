from typing import Any

from fastapi import Depends, FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db


class CsvRow(BaseModel):
    # Mirrors the frontend CsvRow: arbitrary string/number columns from the CSV
    model_config = {"extra": "allow"}


class ChunkPayload(BaseModel):
    uploadId: str              # Identifies the overall file upload session
    chunkIndex: int            # Sequential order of this batch
    rows: list[dict[str, Any]] # Each row is a flat key→value map


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


@app.post("/login_check")
async def loginCheckin(username: str, password: str) -> bool:
    return True


@app.post("/upload")
async def upload_file(
    payload: ChunkPayload,
    idempotency_key: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    # TODO: check idempotency_key against DB to prevent duplicate uploads
    # TODO: persist payload.rows via ImportJob/ImportedRow models
    return {"status": "success", "message": f"Chunk {payload.chunkIndex} saved"}
