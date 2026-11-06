from typing import List
from fastapi import APIRouter, Query
from app.schemas.audit import AuditLogEntry
from app.services import audit_service

router = APIRouter(prefix="/api/audit-logs", tags=["Audit"])


@router.get("", response_model=List[AuditLogEntry], summary="Get chronological audit ledger")
def list_audit_logs(
    limit: int = Query(100, ge=1, le=500, description="Max records to retrieve"),
):
    return audit_service.list_logs(limit=limit)
