from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class LineDiff(BaseModel):
    num: int
    text: str
    type: str  # "context" | "added" | "deleted"


class PatchProposal(BaseModel):
    id: str
    incident_id: str = Field(..., alias="incidentId")
    file_path: str = Field(..., alias="filePath")
    diff: Optional[str] = ""
    diff_summary: Optional[str] = Field(None, alias="diffSummary")
    explanation: str
    status: str = Field(default="pending", description="pending | approved | rejected | applied | verified | failed")
    original_lines: List[Dict[str, Any]] = Field(default_factory=list, alias="originalLines")
    patched_lines: List[Dict[str, Any]] = Field(default_factory=list, alias="patchedLines")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="createdAt")
    decision: Optional[str] = None
    decided_at: Optional[str] = Field(None, alias="decidedAt")
    applied_at: Optional[str] = Field(None, alias="appliedAt")
    actor: Optional[str] = None
    approved_by: Optional[str] = Field(None, alias="approvedBy")

    model_config = ConfigDict(populate_by_name=True)


class PatchDecisionRequest(BaseModel):
    decision: str = Field(..., description="'approve' or 'reject'")
    notes: Optional[str] = Field(None, description="Approval notes")
    reason: Optional[str] = Field(None, description="Rejection reason if rejected")
    actor: Optional[str] = Field("Human Operator", description="Operator name or ID")


class PatchDecisionResponse(BaseModel):
    success: bool
    incident_id: str = Field(..., alias="incidentId")
    patch_id: Optional[str] = Field(None, alias="patchId")
    decision: str
    status: str
    message: str
    decided_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="decidedAt")

    model_config = ConfigDict(populate_by_name=True)
