from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class AgentLogEntry(BaseModel):
    id: str
    incident_id: str = Field(..., alias="incidentId")
    agent_name: str = Field(..., alias="agentName")
    action: str
    status: str = Field(default="completed", description="completed | pending | running | failed")
    input_summary: Optional[str] = Field(None, alias="inputSummary")
    output_summary: Optional[str] = Field(None, alias="outputSummary")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%H:%M:%S UTC"))
    error: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class AgentTimelineItem(BaseModel):
    agent: str
    action: str
    timestamp: str
    status: str = "completed"
    details: Optional[str] = None


class FleetAgent(BaseModel):
    name: str
    role: str
    status: str  # "active" | "idle" | "standby" | "evaluating"
    status_text: str = Field(..., alias="statusText")
    model: str
    latency: str
    health: int
    processed_count: int = Field(0, alias="processedCount")
    accuracy: str
    description: str
    tags: List[str] = Field(default_factory=list)
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list, alias="recentActivity")

    model_config = ConfigDict(populate_by_name=True)
