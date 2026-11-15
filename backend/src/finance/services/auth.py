from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from finance.models.user import User
from finance.core.security import hash_password, verify_password
from finance.repositories import users as users_repository
from finance.services import sessions as sessions_service


"""
Defining our dummy hash to perform verification when an email is not registered.
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
) -> sessions_service.CreatedSession:

    # Commit session creation only after credentials have been verified.
    async with db.begin():

        # First we get our user object from the repository
        user = await users_repository.find_by_email(db, email)

        # Then we get our stored hash, or the dummy hash if no user was found
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

        # If we have a matching user and password, create their login session
        created_session = await sessions_service.create_session(
            db,
            user.id,
        )

    # Return the session token and expiration after the transaction commits
    return created_session


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

        # Adding our user to our db. If there is a conflict it is handled at insertion.
        user = await users_repository.create_user(
            db,
            name,
            email,
            password_hash,
        )

        # If the email is already registered in our db, then we raise an error
        if user is None:
            raise EmailAlreadyRegisteredError()

    # Finally we return our user object
    return user