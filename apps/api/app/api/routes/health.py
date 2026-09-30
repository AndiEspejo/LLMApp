import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    environment: str
    database: Literal["ok", "error"]


@router.get("/health", response_model=HealthResponse)
def health(response: Response, db: Annotated[Session, Depends(get_db)]) -> HealthResponse:
    """Readiness check: the API is up and can reach Postgres.

    Returns 503 when the database is unreachable so load balancers and
    uptime checks treat the service as unhealthy.
    """
    settings = get_settings()
    try:
        db.execute(text("SELECT 1"))
        database: Literal["ok", "error"] = "ok"
    except SQLAlchemyError:
        logger.exception("Health check: database unreachable")
        database = "error"

    if database != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status="ok" if database == "ok" else "degraded",
        version=settings.app_version,
        environment=settings.environment,
        database=database,
    )
