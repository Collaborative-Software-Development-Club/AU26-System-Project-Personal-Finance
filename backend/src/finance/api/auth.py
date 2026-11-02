from fastapi import APIRouter, Depends, HTTPException
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

    # Logging in, if we get invalid credentials then we will raise and error.
    try:
        return await auth_service.login(
            db,
            body.email,
            body.password,
        )
    except auth_service.InvalidCredentialsError:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        ) from None