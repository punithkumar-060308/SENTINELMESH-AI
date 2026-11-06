from datetime import datetime, timezone
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field


class EvidenceCreate(BaseModel):
    id: Optional[str] = None
    incident_id: str = Field(..., alias="incidentId")
    type: str = Field(..., description="log | stack_trace | metric | health_check | config")
    source: str
    content: Any
    collected_at: Optional[str] = Field(None, alias="collectedAt")

    model_config = ConfigDict(populate_by_name=True)


class EvidenceResponse(BaseModel):
    id: str
    incident_id: str = Field(..., alias="incidentId")
    type: str
    source: str
    content: Any
    collected_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="collectedAt")

    model_config = ConfigDict(populate_by_name=True)
