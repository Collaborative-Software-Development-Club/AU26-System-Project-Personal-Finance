import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from finance.core.config import settings
from finance.core.session_tokens import (
    generate_session_token,
    hash_session_token,
    token_fingerprint,
)
from finance.repositories import sessions as sessions_repository
from finance.models.session import UserSession

logger = logging.getLogger(__name__)


@dataclass
class CreatedSession:
    token: str = field(repr=False)
    expires_at: datetime
    session_id: int
    user_id: int

"""
Exception that handles an invalid session error.
"""
class InvalidSessionError(Exception):
    pass

"""
Creates a session And places it into a database as well as returns a created session model.
"""
async def create_session(
    db: AsyncSession,
    user_id: int,
) -> CreatedSession:
    token = generate_session_token()
    token_hash = hash_session_token(token)

    # Getting our session lifetime
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.session_lifetime_seconds,
    )

    # Places our session into the database
    session = await sessions_repository.create_session(
        db,
        user_id,
        token_hash,
        expires_at,
    )

    logger.debug(
        "session created user_id=%s session_id=%s token_fp=%s expires_at=%s",
        user_id,
        session.id,
        token_fingerprint(token),
        expires_at.isoformat(),
    )

    # Returns are created session model
    return CreatedSession(
        token=token,
        expires_at=expires_at,
        session_id=session.id,
        user_id=user_id,
    )

"""
Return an existing, unexpired session for the supplied token.
"""
async def validate_session(
    db: AsyncSession,
    token: str,
) -> UserSession:
    
    if not token:
        logger.debug("session rejected reason=missing")
        raise InvalidSessionError()

    token_hash = hash_session_token(token)
    fingerprint = token_fingerprint(token)

    session = await sessions_repository.find_by_token_hash(
        db,
        token_hash,
    )

    if session is None:
        logger.debug("session rejected token_fp=%s reason=unknown", fingerprint)
        raise InvalidSessionError()

    if session.expires_at <= datetime.now(timezone.utc):
        logger.debug(
            "session rejected token_fp=%s session_id=%s reason=expired",
            fingerprint,
            session.id,
        )
        raise InvalidSessionError()

    logger.debug(
        "session validated user_id=%s session_id=%s token_fp=%s",
        session.user_id,
        session.id,
        fingerprint,
    )
    return session

"""
Removes the current session from the database and then clears the browser cookie.
"""
async def logout(
    db: AsyncSession,
    token: str | None,
) -> None:
    if not token:
        logger.debug("logout skipped reason=missing_cookie")
        return

    token_hash = hash_session_token(token)
    fingerprint = token_fingerprint(token)

    async with db.begin():
        session = await sessions_repository.find_by_token_hash(
            db,
            token_hash,
        )

        if session is None:
            logger.debug("logout skipped token_fp=%s reason=unknown", fingerprint)
            return

        await sessions_repository.delete_session(
            db,
            session.id,
        )
        logger.info(
            "session deleted user_id=%s session_id=%s token_fp=%s",
            session.user_id,
            session.id,
            fingerprint,
        )