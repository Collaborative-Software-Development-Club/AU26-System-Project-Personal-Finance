from sqlalchemy.ext.asyncio import AsyncSession

from finance.repositories import users as users_repository


"""
Handles the login process for the /login route, using our database session, email and passowrd.
"""
async def login(
        db: AsyncSession,
        email: str,
        password: str,
) -> dict[str, str]:

    # First we get our user object from the repository
    user = await users_repository.find_by_email(db,email)

    # TODO: handle a missing user and verify the password