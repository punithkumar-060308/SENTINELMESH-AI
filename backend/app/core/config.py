import os
import sys
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEFAULT_JWT_SECRET = "sentinelmesh_default_insecure_jwt_secret_change_in_production"


class Settings(BaseSettings):
    PROJECT_NAME: str = "SentinelMesh AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    TESTING: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return [str(i).strip() for i in v if str(i).strip()]
        return []

    # MongoDB persistence
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "sentinelmesh_db"

    # Authentication & Security
    INSECURE_DEFAULT_JWT_SECRET: str = INSECURE_DEFAULT_JWT_SECRET
    JWT_SECRET_KEY: str = INSECURE_DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # AI Configuration (Optional)
    GEMINI_API_KEY: str = ""

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        env = (self.ENVIRONMENT or "").strip().lower()
        if env == "production":
            # 1. Reject insecure default JWT secret in production
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY == self.INSECURE_DEFAULT_JWT_SECRET:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: In production, JWT_SECRET_KEY must be "
                    "configured in environment variables with a strong, secure secret key (e.g. openssl rand -hex 32). "
                    "Insecure default secret key fallback is strictly forbidden in production."
                )

            # 2. Strict CORS in production: Disallow wildcard '*'
            origins = self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else [self.CORS_ORIGINS]
            filtered = [o for o in origins if o != "*"]
            if "*" in origins:
                # Disallow wildcard in production
                origins = filtered

            # Enforce deployed domain configuration in production
            if not origins:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: In production, CORS_ORIGINS must specify "
                    "the exact deployed frontend origin(s) and cannot be empty or wildcard '*'."
                )
            self.CORS_ORIGINS = origins

        return self

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()

if (
    "pytest" in sys.modules
    or os.environ.get("ENVIRONMENT") == "testing"
    or os.environ.get("TESTING", "").lower() in ("true", "1")
):
    settings.TESTING = True
    settings.ENVIRONMENT = "testing"
