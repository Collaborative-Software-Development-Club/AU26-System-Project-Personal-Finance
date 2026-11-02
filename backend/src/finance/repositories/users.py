from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

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


"""
Creates our user object and places it in our database. Handles 
conflicts if a user makes 2 users of the same email.
"""
async def create_user(
        db: AsyncSession,
        name: str,
        email: str,
        password_hash: str,
) -> User | None:

    # Creating our user object. On the event of conflict we will skip this insertion.
    statement = (
        insert(User).values(
            name=name,
            email=email,
            password_hash=password_hash,
        ).on_conflict_do_nothing(index_elements=[User.email]).returning(User)
    )

    # If we have our result we will execute the insertion into our database directly
    result = await db.execute(statement)

    # Returning our resulting user object if we have one and None otherwise
    return result.scalar_one_or_none()