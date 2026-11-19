import logging

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from finance.db.session import get_db
from finance.models.constants import SESSION_COOKIE_NAME
from finance.models.session import UserSession
from finance.models.user import User
from finance.repositories import users as users_repository
from finance.services import sessions as sessions_service

logger = logging.getLogger(__name__)


async def get_current_session(
    token: str | None = Cookie(
        default=None,
        alias=SESSION_COOKIE_NAME,
    ),
    db: AsyncSession = Depends(get_db),
) -> UserSession:
    if token is None:
        logger.debug("request unauthenticated reason=missing_cookie")
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    try:
        return await sessions_service.validate_session(db, token)
    except sessions_service.InvalidSessionError:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        ) from None

async def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await users_repository.find_by_id(
        db,
        session.user_id,
    )

    if user is None:
        logger.debug(
            "request unauthenticated session_id=%s reason=missing_user",
            session.id,
        )
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    return user