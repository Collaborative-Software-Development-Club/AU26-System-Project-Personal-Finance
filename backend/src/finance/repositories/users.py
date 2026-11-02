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


"""
Creates our user object and places it in our database.
"""
async def create_user(
        db: AsyncSession,
        name: str,
        email: str,
        password_hash: str,
) -> User:

    # Creating our user object
    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
    )

    # Stages the user to be added to the database during the next write
    db.add(user)

    # Execute the database insetion
    await db.flush()

    # Finally we return our user object
    return user