"""Workflow state management for SentinelMesh Multi-Agent Orchestrator."""

from typing import List, Dict, Any, Optional
from agents.common.schemas import (
    WorkflowState,
    ObserverOutput,
    InvestigatorOutput,
    RepairOutput,
    VerifierOutput,
    AgentActivityEvent,
)

# Valid workflow statuses
VALID_STATUSES = {
    "detected",
    "investigating",
    "patch_pending_approval",
    "approved",
    "rejected",
    "verifying",
    "recovered",
    "failed",
}


def transition_workflow(state: WorkflowState, new_status: str, step: str = None) -> WorkflowState:
    """Safely transition workflow status with validation."""
    if new_status not in VALID_STATUSES:
        raise ValueError(f"Invalid workflow status '{new_status}'. Allowed: {VALID_STATUSES}")
    
    state.workflow_status = new_status
    if step:
        state.current_step = step
    return state
