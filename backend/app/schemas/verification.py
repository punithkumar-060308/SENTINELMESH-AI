from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class TestCaseItem(BaseModel):
    name: str
    status: str = "passed"  # "passed" | "failed" | "skipped"
    duration: str = "120ms"


class VerificationRunRequest(BaseModel):
    patch_id: Optional[str] = Field(None, alias="patchId")
    isolated_env: Optional[str] = Field("mesh-sandbox-isolated (Docker rootless)", alias="isolatedEnv")

    model_config = ConfigDict(populate_by_name=True)


class VerificationRunResponse(BaseModel):
    id: str
    run_id: Optional[str] = Field(None, alias="runId")
    container_id: Optional[str] = Field(None, alias="containerId")
    incident_id: str = Field(..., alias="incidentId")
    patch_id: Optional[str] = Field(None, alias="patchId")
    target_file: Optional[str] = Field("ServiceHandler", alias="targetFile")
    status: str = Field("passed", description="passed | failed | running")
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    duration_ms: int = Field(0, alias="durationMs")
    completed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="completedAt")
    environment: str = Field("mesh-sandbox-isolated (Docker rootless)")
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    test_output_summary: Optional[str] = Field(None, alias="testOutputSummary")

    model_config = ConfigDict(populate_by_name=True)
