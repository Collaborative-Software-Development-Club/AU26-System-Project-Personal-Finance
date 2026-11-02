from fastapi import APIRouter

from finance.schemas.auth import LoginRequest


# Defining our auth routing group
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(body: LoginRequest):

    # Auth service will eventually be called here
    return {"message": "Login request recieved"}