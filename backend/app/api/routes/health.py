from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.db.mongodb import db_manager

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Application health check")
def health_check():
    db_status = "connected" if db_manager.is_connected else "in_memory_fallback"
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
