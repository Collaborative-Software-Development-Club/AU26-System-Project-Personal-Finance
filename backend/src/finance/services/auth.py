from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from finance.models.user import User
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
Error that will handle if the user is trying to register an email that is already registered.
"""
class EmailAlreadyRegisteredError(Exception):
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


"""

"""
async def register(
        db: AsyncSession,
        name: str,
        email: str,
        password: str, 
) -> User:

    # First we get our password hash by running hash password in our threadpool
    password_hash = await run_in_threadpool(
        hash_password,
        password,
    )

    async with db.begin():

        # Then we see if we have an existing user with the given email
        existing_user = await users_repository.find_by_email(db, email)

        # If the email is already registered in our db, then we raise an error
        if existing_user is not None:
            raise EmailAlreadyRegisteredError()

        # Then we create our user using our helper function
        user = await users_repository.create_user(
            db,
            name,
            email,
            password_hash,
        )

    # Finally we return our user object
    return user