from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Aerostake API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    HOST: str = "0.0.0.0"
    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://aerostake_user:aerostake_password@localhost:5432/aerostake_db"
    DB_ECHO: bool = False

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"

    # Notification Services
    RESEND_API_KEY: Union[str, None] = None
    RESEND_FROM_EMAIL: str = "notifications@latrics.com"
    FIREBASE_CREDENTIALS_PATH: Union[str, None] = None

    # JWT Authentication
    JWT_SECRET_KEY: str = "aerostake_dev_secret_key_change_in_production_9876543210"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[List[str], str, None]) -> List[str]:
        if value is None:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed]
            except Exception:
                return [origin.strip() for origin in value.split(",") if origin.strip()]
        return [str(item) for item in value]


@lru_cache
def get_settings() -> Settings:
    return Settings()
