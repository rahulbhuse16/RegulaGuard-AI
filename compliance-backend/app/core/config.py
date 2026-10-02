"""
Centralized application configuration.

All environment-specific values MUST come from environment variables.
Never hardcode secrets or connection strings here.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Application ---
    APP_NAME: str = "Banking Regulatory Compliance Platform"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # --- Database ---
    DATABASE_URL: str
    ASYNC_DATABASE_URL: str

    # --- Auth ---
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    # --- LLM provider (configurable; free-tier default is Groq) ---
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    LLM_TEMPERATURE: float = 0.0
    LLM_MAX_RETRIES: int = 2
    LLM_TIMEOUT_SECONDS: int = 60

    # --- Embeddings ---
    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384

    # --- Storage ---
    STORAGE_PROVIDER: str = "local"
    STORAGE_LOCAL_PATH: str = "./storage/documents"

    # --- Misc ---
    LOG_LEVEL: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
