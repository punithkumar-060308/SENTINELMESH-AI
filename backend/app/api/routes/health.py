from datetime import datetime, timezone
from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.db.mongodb import db_manager

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Application health check")
def health_check(response: Response):
    is_prod = (settings.ENVIRONMENT or "").strip().lower() == "production"

    # Active database connectivity verification
    db_connected = False
    if db_manager.is_connected and db_manager.client is not None:
        db_connected = db_manager.ping()

    if db_connected:
        db_name = db_manager.db.name if db_manager.db is not None else None
        try:
            doc_count = db_manager.db["incidents"].count_documents({}) if db_manager.db is not None else 0
            incident_ids = [d.get("id") for d in db_manager.db["incidents"].find({}, {"id": 1})] if db_manager.db is not None else []
        except Exception:
            doc_count = 0
            incident_ids = []

        overall_status = "healthy"
        db_info = {
            "status": "connected",
            "type": "mongodb",
            "name": db_name,
            "incident_count": doc_count,
            "incident_ids": incident_ids,
        }
    else:
        if is_prod:
            overall_status = "unhealthy"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            db_info = {
                "status": "disconnected",
                "type": "mongodb",
                "error": "MongoDB Atlas connection is required in production but unavailable or authentication failed.",
            }
        else:
            overall_status = "ok"
            db_info = {
                "status": "in_memory_fallback",
                "type": "in_memory",
                "note": "Running in-memory storage fallback for development and testing environments only.",
            }

    return {
        "status": overall_status,
        "api": "available",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_info,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
