from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from finance.models.user import User

"""
Takes in our database session and email as a string, and returns the user object
assicated with that email.
"""
async def find_by_email(
        db: AsyncSession,
        email: str,
) -> User | None:

    # Constructing our query to find the user with the supplied email  
    query = select(User).where(User.email == email)

    # Execuring our query
    result = await db.execute(query)

    # Returning either our user object or none if nothing was found
    return result.scalar_one_or_none()