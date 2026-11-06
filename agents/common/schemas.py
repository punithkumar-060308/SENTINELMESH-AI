"""Pydantic schemas for SentinelMesh AI Agents.
Adheres strictly to 04_AI_AGENTS_IMPLEMENTATION.md specifications.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


def current_utc_iso() -> str:
    """Return current UTC timestamp in ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Agent Activity Event (for Immutable Mesh Audit Ledger)
# ---------------------------------------------------------------------------
class AgentActivityEvent(BaseModel):
    """Event recording agent action for auditability."""
    event_id: str
    incident_id: str
    agent_name: str  # e.g., 'Observer Agent', 'Investigator Agent', 'Repair Agent', 'Verifier Agent'
    action: str      # e.g., 'INCIDENT_OBSERVED', 'ROOT_CAUSE_ISOLATED', 'PATCH_SYNTHESIZED', etc.
    timestamp: str = Field(default_factory=current_utc_iso)
    details: str
    status: str = "completed"
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# 1. Observer Agent Schemas
# ---------------------------------------------------------------------------
class ObserverInput(BaseModel):
    """Input parameters delivered to the Observer Agent."""
    incident_id: Optional[str] = None
    incident_trigger: str
    application: str
    error_message: str
    logs: List[str] = Field(default_factory=list)
    stack_trace: Optional[str] = None
    health_check_result: Optional[Dict[str, Any]] = None


class ObserverOutput(BaseModel):
    """Structured evidence collected and normalized by the Observer Agent."""
    incident_summary: str
    error_type: str
    relevant_log_excerpts: List[str] = Field(default_factory=list)
    stack_trace_reference: Optional[str] = None
    evidence_sources: List[str] = Field(default_factory=list)
    collection_timestamp: str = Field(default_factory=current_utc_iso)
    missing_evidence_list: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 2. Investigator Agent Schemas
# ---------------------------------------------------------------------------
class InvestigatorInput(BaseModel):
    """Input parameters delivered to the Investigator Agent."""
    evidence: ObserverOutput
    relevant_source_snippets: Dict[str, str] = Field(default_factory=dict)  # filepath -> snippet
    application_context: Dict[str, Any] = Field(default_factory=dict)
    test_failure_details: Optional[Dict[str, Any]] = None


class InvestigatorOutput(BaseModel):
    """Root-cause analysis and ranked hypotheses produced by Investigator Agent."""
    root_cause_summary: str
    reasoning_summary: str
    supporting_evidence: List[str] = Field(default_factory=list)
    suspected_files: List[str] = Field(default_factory=list)
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model-estimated confidence score")
    confidence_label: str = Field(..., description="Explanation of confidence and model estimation label")
    alternative_hypotheses: List[str] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 3. Repair Agent Schemas
# ---------------------------------------------------------------------------
class RepairInput(BaseModel):
    """Input parameters delivered to the Repair Agent."""
    diagnosis: InvestigatorOutput
    relevant_source_snippets: Dict[str, str]  # filepath -> content
    allowed_paths: List[str]                  # Whitelist of editable paths
    existing_tests: List[str] = Field(default_factory=list)
    expected_behavior: str = ""


class RepairOutput(BaseModel):
    """Minimal, reviewable patch proposal produced by the Repair Agent."""
    target_file: str
    diff: str
    explanation: str
    expected_behavior: str
    potential_risks: List[str] = Field(default_factory=list)
    suggested_tests: List[str] = Field(default_factory=list)
    status: str = "pending"  # MUST remain pending until human decision


# ---------------------------------------------------------------------------
# 4. Verifier Agent Schemas
# ---------------------------------------------------------------------------
class VerifierInput(BaseModel):
    """Input parameters delivered to the Verifier Agent."""
    incident_id: str
    patch_id: str
    human_approval: Dict[str, Any]  # Must contain decision: "approved"
    test_command: str = "pytest"
    test_suite: str = "regression"
    timeout_seconds: int = 30
    target_path: Optional[str] = None
    patch_diff: Optional[str] = None


class VerifierOutput(BaseModel):
    """Execution results and regression verification outcome from the Verifier Agent."""
    test_run_status: str  # "passed", "failed", "error", "timeout"
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    exit_code: int = 0
    duration_ms: int = 0
    test_output: str = ""
    original_failure_resolved: bool = False
    regression_tests_passed: bool = False
    final_verification_result: str  # "verified_recovery" or "failed"


# ---------------------------------------------------------------------------
# 5. Shared Workflow State
# ---------------------------------------------------------------------------
class WorkflowState(BaseModel):
    """Shared input context and overall state carried across the SentinelMesh pipeline.
    Implements Section: Shared input context in 04_AI_AGENTS_IMPLEMENTATION.md.
    """
    incident_id: str
    application: str
    error_summary: str
    logs: List[str] = Field(default_factory=list)
    stack_trace: Optional[str] = None
    relevant_files: List[str] = Field(default_factory=list)
    test_results: Optional[Dict[str, Any]] = None
    patch: Optional[RepairOutput] = None
    human_decision: Optional[Dict[str, Any]] = None
    agent_events: List[AgentActivityEvent] = Field(default_factory=list)
    workflow_status: str = "detected"  # detected, investigating, patch_pending_approval, approved, rejected, verifying, recovered, failed
    current_step: str = "init"
    evidence: Optional[ObserverOutput] = None
    diagnosis: Optional[InvestigatorOutput] = None
    verification: Optional[VerifierOutput] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
