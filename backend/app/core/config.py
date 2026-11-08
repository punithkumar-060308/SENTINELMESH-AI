import os
import sys
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
        return v

    # MongoDB persistence
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "sentinelmesh_db"

    # AI Configuration (Optional)
    GEMINI_API_KEY: str = ""

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
