from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from finance.core.security import hash_password, verify_password
from finance.repositories import users as users_repository


"""
Defining our dummy hash password that I will use for testing purposes.
"""
DUMMY_HASH = hash_password("dummy-password-for-missing-users")


"""
Error that will handle if we have an invalid user or an invalid password.
"""
class InvalidCredentialsError(Exception):
    pass


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

    # Then we get our stored hash for the user if we have one (Will remove dummy hash when it works)
    stored_hash = DUMMY_HASH if user is None else user.password_hash

    # Then we verify the password matches using verify_password in a worker thread
    password_matches = await run_in_threadpool(
        verify_password,
        password,
        stored_hash,
    )

    # Raising an error if either our user or our password doesn't match
    if user is None or not password_matches:
        raise InvalidCredentialsError()

    # If we have a matching user and pass, then we will return credentials verified
    return {"message": "Credentials verified; session not implemented yet"}