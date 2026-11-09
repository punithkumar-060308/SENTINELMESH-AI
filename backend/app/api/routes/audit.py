from typing import List
from fastapi import APIRouter, Query, Depends
from app.dependencies.auth import require_authenticated_operator
from app.schemas.audit import AuditLogEntry
from app.services import audit_service

router = APIRouter(prefix="/api/audit-logs", tags=["Audit"])


@router.get("", response_model=List[AuditLogEntry], summary="Get chronological audit ledger")
def list_audit_logs(
    limit: int = Query(100, ge=1, le=500, description="Max records to retrieve"),
    operator: dict = Depends(require_authenticated_operator),
):
    return audit_service.list_logs(limit=limit)
