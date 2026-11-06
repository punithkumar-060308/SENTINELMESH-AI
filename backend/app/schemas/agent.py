from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class AgentLogEntry(BaseModel):
    id: str
    incident_id: str = Field(..., alias="incidentId")
    agent_name: str = Field(..., alias="agentName")
    action: Optional[str] = "EXECUTE"
    status: str = Field(default="completed", description="completed | pending | running | failed | idle")
    input_summary: Optional[str] = Field(None, alias="inputSummary")
    output_summary: Optional[str] = Field(None, alias="outputSummary")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%H:%M:%S UTC"))
    started_at: Optional[str] = Field(None, alias="startedAt")
    completed_at: Optional[str] = Field(None, alias="completedAt")
    error: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class AgentTimelineItem(BaseModel):
    agent: str
    action: str
    timestamp: str
    status: str = "completed"
    details: Optional[str] = None


class FleetAgent(BaseModel):
    id: Optional[str] = None
    agent_id: Optional[str] = Field(None, alias="agentId")
    name: str
    role: str
    status: str  # "idle" | "running" | "completed" | "failed" | "pending_approval" | "active" | "evaluating" | "standby"
    status_text: str = Field(..., alias="statusText")
    model: str
    latency: str
    health: int
    processed_count: int = Field(0, alias="processedCount")
    accuracy: Optional[str] = "99.0%"
    description: str
    tags: List[str] = Field(default_factory=list)
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list, alias="recentActivity")

    # UI presentation & metrics
    icon: Optional[str] = None
    last_activity: Optional[str] = Field(None, alias="lastActivity")
    last_run_time: Optional[str] = Field(None, alias="lastRunTime")
    current_incident_id: Optional[str] = Field(None, alias="currentIncidentId")
    metric_label1: Optional[str] = Field(None, alias="metricLabel1")
    metric_value1: Optional[str] = Field(None, alias="metricValue1")
    metric_label2: Optional[str] = Field(None, alias="metricLabel2")
    metric_value2: Optional[str] = Field(None, alias="metricValue2")
    metric_label3: Optional[str] = Field(None, alias="metricLabel3")
    metric_value3: Optional[str] = Field(None, alias="metricValue3")
    capabilities: List[str] = Field(default_factory=list)

    # Agent-specific operational fields (Phase 2)
    execution_status: Optional[str] = Field(None, alias="executionStatus")
    evidence_count: Optional[int] = Field(None, alias="evidenceCount")
    root_cause: Optional[str] = Field(None, alias="rootCause")
    confidence: Optional[float] = None
    proposed_patch_id: Optional[str] = Field(None, alias="proposedPatchId")
    patch_status: Optional[str] = Field(None, alias="patchStatus")
    files_affected: List[str] = Field(default_factory=list, alias="filesAffected")
    tests_passed: Optional[int] = Field(None, alias="testsPassed")
    tests_failed: Optional[int] = Field(None, alias="testsFailed")
    verification_result: Optional[str] = Field(None, alias="verificationResult")
    error: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)
