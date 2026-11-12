from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Defining our object that will perform our hashing and verification
password_hasher = PasswordHasher()


"""
Generates our fresh salt and returns our encoded hash including its salt and algorithm settings.
"""
def hash_password(password: str) -> str:
    return password_hasher.hash(password)


"""
Checks a submitted password against its encoded values using the entered password and the stored hash.
"""
def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return password_hasher.verify(stored_hash, password)
    except VerifyMismatchError:
        return False