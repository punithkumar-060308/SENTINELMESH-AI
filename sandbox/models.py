"""Data models and schemas for the SentinelMesh AI Sandbox Subsystem.
Adheres strictly to Section 06_SANDBOX_IMPLEMENTATION.md.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class SandboxExecutionResult(BaseModel):
    """Structured execution result returned by the Sandbox service."""
    run_id: str = Field(..., alias="runId")
    incident_id: str = Field(..., alias="incidentId")
    patch_id: str = Field(..., alias="patchId")
    status: str = Field(..., description="created | applying | applied | passed | failed | timed_out")
    changed_files: List[str] = Field(default_factory=list, alias="changedFiles")
    exit_code: Optional[int] = Field(None, alias="exitCode")
    stdout_summary: str = Field("", alias="stdoutSummary")
    stderr_summary: str = Field("", alias="stderrSummary")
    started_at: str = Field(..., alias="startedAt")
    completed_at: Optional[str] = Field(None, alias="completedAt")
    duration_ms: int = Field(0, alias="durationMs")
    passed_count: int = Field(0, alias="passedCount")
    failed_count: int = Field(0, alias="failedCount")
    skipped_count: int = Field(0, alias="skippedCount")
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    isolated_env: str = Field("mesh-sandbox-isolated (Docker rootless / restricted)", alias="isolatedEnv")
    timed_out: bool = Field(False, alias="timedOut")
    error: Optional[str] = None
    cleaned_up: bool = Field(True, alias="cleanedUp")

    model_config = ConfigDict(populate_by_name=True)


class PatchValidationResult(BaseModel):
    """Result returned by the PatchValidator."""
    is_valid: bool = Field(..., alias="isValid")
    target_file: str = Field(..., alias="targetFile")
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")
    lines_added: int = Field(0, alias="linesAdded")
    lines_deleted: int = Field(0, alias="linesDeleted")
    total_bytes: int = Field(0, alias="totalBytes")

    model_config = ConfigDict(populate_by_name=True)
