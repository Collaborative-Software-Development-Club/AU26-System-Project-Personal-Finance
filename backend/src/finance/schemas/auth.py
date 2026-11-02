from pydantic import BaseModel


"""
Requests to login will contain an email and password which must be authenticated.
"""
class LoginRequest(BaseModel):
    email: str
    password: str


"""
Registration Requests will contain a name, an email, and then a password.
"""
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str