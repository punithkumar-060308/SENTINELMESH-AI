from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class IncidentBase(BaseModel):
    title: str = Field(..., description="Short descriptive title of the incident")
    application: str = Field(..., description="Application or service identifier")
    description: Optional[str] = Field(None, description="Detailed incident description")
    severity: str = Field(default="medium", description="critical | high | medium | low")
    status: str = Field(default="detected", description="detected | investigating | awaiting_approval | approved | applying | verifying | recovered | failed | rejected")


class IncidentCreate(BaseModel):
    id: Optional[str] = Field(None, description="Optional custom ID (e.g. INC-001)")
    title: str
    application: str
    description: Optional[str] = None
    severity: str = "medium"
    status: Optional[str] = "detected"
    version: Optional[str] = "v1.0"
    signature: Optional[str] = None
    location: Optional[str] = None
    trace_id: Optional[str] = Field(None, alias="traceId")
    impact: Optional[str] = None
    stack_trace: Optional[str] = Field(None, alias="stackTrace")
    evidence_ids: List[str] = Field(default_factory=list, alias="evidenceIds")
    raw_logs: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    application: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    pipeline_agent: Optional[str] = Field(None, alias="pipelineAgent")
    active_step: Optional[int] = Field(None, alias="activeStep")
    root_cause: Optional[str] = Field(None, alias="rootCause")
    source_file: Optional[str] = Field(None, alias="sourceFile")
    confidence: Optional[float] = None
    blast_radius: Optional[str] = Field(None, alias="blastRadius")
    blast_radius_detail: Optional[str] = Field(None, alias="blastRadiusDetail")
    correlated_pr: Optional[str] = Field(None, alias="correlatedPR")
    proposed_patch: Optional[Dict[str, Any]] = Field(None, alias="proposedPatch")
    evidence_ids: Optional[List[str]] = Field(None, alias="evidenceIds")

    model_config = ConfigDict(populate_by_name=True)


class IncidentResponse(IncidentBase):
    id: str
    version: Optional[str] = "v1.0"
    detected_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="detectedAt")
    detected_time: Optional[str] = Field("Just now", alias="detectedTime")
    signature: Optional[str] = None
    location: Optional[str] = None
    trace_id: Optional[str] = Field(None, alias="traceId")
    impact: Optional[str] = None
    pipeline_agent: Optional[str] = Field(None, alias="pipelineAgent")
    active_step: Optional[int] = Field(1, alias="activeStep")
    stack_trace: Optional[str] = Field(None, alias="stackTrace")
    root_cause: Optional[str] = Field(None, alias="rootCause")
    source_file: Optional[str] = Field(None, alias="sourceFile")
    confidence: Optional[float] = None
    blast_radius: Optional[str] = Field("Isolated", alias="blastRadius")
    blast_radius_detail: Optional[str] = Field(None, alias="blastRadiusDetail")
    correlated_pr: Optional[str] = Field(None, alias="correlatedPR")
    evidence_ids: List[str] = Field(default_factory=list, alias="evidenceIds")
    proposed_patch: Optional[Dict[str, Any]] = Field(None, alias="proposedPatch")
    pod_logs: List[Dict[str, Any]] = Field(default_factory=list, alias="podLogs")
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class IncidentAnalyzeResponse(BaseModel):
    incident_id: str = Field(..., alias="incidentId")
    status: str
    message: str
    pipeline_agent: Optional[str] = Field(None, alias="pipelineAgent")
    workflow_job_id: Optional[str] = Field(None, alias="workflowJobId")

    model_config = ConfigDict(populate_by_name=True)


class IncidentReportResponse(BaseModel):
    incident_id: str = Field(..., alias="incidentId")
    title: str
    application: str
    severity: str
    status: str
    detected_at: str = Field(..., alias="detectedAt")
    resolved_at: Optional[str] = Field(None, alias="resolvedAt")
    root_cause: Optional[str] = Field(None, alias="rootCause")
    patch_summary: Optional[str] = Field(None, alias="patchSummary")
    verification_summary: Optional[str] = Field(None, alias="verificationSummary")
    timeline_steps: List[Dict[str, Any]] = Field(default_factory=list, alias="timelineSteps")
    verdict: str

    model_config = ConfigDict(populate_by_name=True)
