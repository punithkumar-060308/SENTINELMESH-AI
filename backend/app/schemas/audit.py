from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
    agent: str = Field(..., description="Agent or Human Gate name")
    action: str = Field(..., description="Action code, e.g. INCIDENT_DETECTED, PATCH_APPROVED")
    incident: Optional[str] = Field(None, description="Incident ID")
    status: str = Field("completed", description="completed | pending | failed")
    details: str
    hash: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)
