from pydantic import BaseModel


# Requests to login will contain an email and password which must be authenticated
class LoginRequest(BaseModel):
    email: str
    password: str