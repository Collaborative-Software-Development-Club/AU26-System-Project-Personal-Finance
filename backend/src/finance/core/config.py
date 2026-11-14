from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str

    # Defines the session token lifetime config
    session_lifetime_seconds: int = Field(
        default=24 * 60 * 60, # 24 Hours
        gt=0,
    )
    session_cookie_secure: bool = True

    @property
    def migration_database_url(self) -> str:
        return self.database_url.replace(
            "postgresql+asyncpg",
            "postgresql+psycopg",
            1,
        )


settings = Settings()
