from typing import List, Dict, Any, Optional
from app.repositories import audit_repo
from app.schemas.audit import AuditLogEntry


class AuditService:
    def __init__(self):
        self.repo = audit_repo

    def record_event(
        self,
        agent: str,
        action: str,
        incident_id: Optional[str] = None,
        status: str = "completed",
        details: str = "",
    ) -> Dict[str, Any]:
        entry = {
            "agent": agent,
            "action": action,
            "incident": incident_id,
            "status": status,
            "details": details,
        }
        return self.repo.create(entry)

    def list_logs(self, limit: int = 100) -> List[AuditLogEntry]:
        raw_logs = self.repo.list_all(limit=limit)
        return [AuditLogEntry(**item) for item in raw_logs]


audit_service = AuditService()
