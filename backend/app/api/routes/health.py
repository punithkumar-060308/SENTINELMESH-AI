from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.db.mongodb import db_manager

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Application health check")
def health_check():
    db_status = "connected" if db_manager.is_connected else "in_memory_fallback"
    db_name = db_manager.db.name if (db_manager.is_connected and db_manager.db is not None) else None
    doc_count = db_manager.db["incidents"].count_documents({}) if (db_manager.is_connected and db_manager.db is not None) else 0
    incident_ids = [d.get("id") for d in db_manager.db["incidents"].find({}, {"id": 1})] if (db_manager.is_connected and db_manager.db is not None) else []
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "database_name": db_name,
        "incident_count": doc_count,
        "incident_ids": incident_ids,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
