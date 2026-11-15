from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from finance.core.config import settings
from finance.db.session import get_db
from finance.models.constants import SESSION_COOKIE_NAME
from finance.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from finance.services import auth as auth_service
from finance.api.dependencies import get_current_user
from finance.models.user import User


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
    response: Response,
    db: AsyncSession = Depends(get_db),
):

    # Logging in, if we get invalid credentials then we will raise an error.
    try:
        created_session = await auth_service.login(
            db,
            body.email,
            body.password,
        )
    except auth_service.InvalidCredentialsError:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        ) from None

    # Send the original session token to the browser in an HTTP-only cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=created_session.token,
        expires=created_session.expires_at,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )

    # Keep the session token out of the JSON response body
    return {"message": "Login successful"}


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

"""
Routes for the current user.
"""
@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(
    user: User = Depends(get_current_user),
) -> User:
    return user