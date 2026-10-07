from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str

    @property
    def migration_database_url(self) -> str:
        return self.database_url.replace(
            "postgresql+asyncpg",
            "postgresql+psycopg",
            1,
        )


settings = Settings()
