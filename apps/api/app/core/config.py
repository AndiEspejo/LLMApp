from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/api/app/core/config.py -> repo root
REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """App configuration, loaded from environment variables and the repo-root .env file.

    Real environment variables always win over values in .env.
    """

    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ClinicFlow API"
    app_version: str = "0.1.0"
    environment: str = "local"

    database_url: str = "postgresql+psycopg://clinicflow:clinicflow@localhost:5432/clinicflow"

    # Comma-separated list, e.g. "http://localhost:3000,https://app.example.com"
    api_cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
