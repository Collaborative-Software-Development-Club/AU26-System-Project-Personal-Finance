from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db
from finance.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from finance.services import auth as auth_service


"""
Defining our auth routing group
"""
router = APIRouter(prefix="/auth", tags=["auth"])


"""
Route for Login Requests.
"""
@router.post("/login")
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):

    # Logging in, if we get invalid credentials then we will raise an error.
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

"""
Route for Registration Requests.
"""
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):

    # Registering the account, if we get an existing registered email, then we will raise an error.
    try:
        return await auth_service.register(
            db,
            body.name,
            body.email,
            body.password
        )
    except auth_service.EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        ) from None