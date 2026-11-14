import hashlib
import secrets

from finance.models.constants import SESSION_TOKEN_BYTES


"""
Generating a random token to send to the browser.
"""
def generate_session_token() -> str:
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


"""
Hashes a token for storage and database lookup.
"""
def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()