from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db
from finance.schemas.auth import LoginRequest
from finance.services import auth as auth_service


# Defining our auth routing group
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.login(body.email, body.password)