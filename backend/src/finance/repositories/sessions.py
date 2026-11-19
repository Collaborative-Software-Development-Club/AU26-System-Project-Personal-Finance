from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from finance.models.session import UserSession

"""
Creates a session and places it into the database.
"""
async def create_session(
    db: AsyncSession,
    user_id: int,
    token_hash: str,
    expires_at: datetime,
) -> UserSession:

    # Creating our session object
    session = UserSession(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    # Adding our session to the database
    db.add(session)
    await db.flush()

    return session

"""
Finds a specific token in the database given its hash and returns its session object if found.
"""
async def find_by_token_hash(
    db: AsyncSession,
    token_hash: str,
) -> UserSession | None:
    statement = select(UserSession).where(
        UserSession.token_hash == token_hash
    )

    result = await db.execute(statement)

    return result.scalar_one_or_none()

"""
Removes a session from the database given the session id.
"""
async def delete_session(
    db: AsyncSession,
    session_id: int,
) -> None:
    statement = delete(UserSession).where(
        UserSession.id == session_id
    )

    await db.execute(statement)