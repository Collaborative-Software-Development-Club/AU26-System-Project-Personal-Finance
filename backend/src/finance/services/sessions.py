from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from finance.core.config import settings
from finance.core.session_tokens import (
    generate_session_token,
    hash_session_token,
)
from finance.repositories import sessions as sessions_repository
from finance.models.session import UserSession


@dataclass
class CreatedSession:
    token: str = field(repr=False)
    expires_at: datetime

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
    await sessions_repository.create_session(
        db,
        user_id,
        token_hash,
        expires_at,
    )

    # Returns are created session model
    return CreatedSession(
        token=token,
        expires_at=expires_at,
    )

"""
Return an existing, unexpired session for the supplied token.
"""
async def validate_session(
    db: AsyncSession,
    token: str,
) -> UserSession:
    
    if not token:
        raise InvalidSessionError()

    token_hash = hash_session_token(token)

    session = await sessions_repository.find_by_token_hash(
        db,
        token_hash,
    )

    if session is None:
        raise InvalidSessionError()

    if session.expires_at <= datetime.now(timezone.utc):
        raise InvalidSessionError()

    return session