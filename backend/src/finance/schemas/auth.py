from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from finance.models.constants import (
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
)

"""
Requests to login will contain an email and password which must be authenticated.
"""
class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


"""
Registration Requests will contain a name, an email, and then a password.
"""
class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    # Defining a class method that will run when we are validating name.
    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:

        # Cleaning our name to remove any spaces at the beginning or end of the string
        cleaned_name = value.strip()

        # If Cleaning our name resulted in an empty string then our name is blank and we must raise a value error
        if not cleaned_name:
            raise ValueError("Name cannot be blank")

        return cleaned_name


"""
Defining the user information that the backend can send to the frontend.
"""
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    created_at: datetime