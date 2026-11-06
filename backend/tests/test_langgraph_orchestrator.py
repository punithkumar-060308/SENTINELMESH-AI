"""Tests for SentinelMesh LangGraph Multi-Agent Orchestrator.
Adheres strictly to 05_ORCHESTRATOR_LANGGRAPH.md:
- Tests the complete orchestration lifecycle
- Verifies human approval pause and resume mechanism
- Tests approval, rejection, and verification failure paths
- Validates repository persistence and safety rules
"""

import pytest
from langgraph.checkpoint.memory import MemorySaver
from agents.orchestrator.langgraph_workflow import (
    LangGraphOrchestratorService,
    LangGraphOrchestratorNodes,
    build_sentinelmesh_graph,
    OrchestratorGraphState,
)
from app.repositories import (
    incident_repo,
    patch_repo,
    verification_repo,
    agent_log_repo,
)


@pytest.fixture
def orchestrator():
    """Create fresh LangGraph orchestrator instance with memory checkpointer."""
    cp = MemorySaver()
    return LangGraphOrchestratorService(checkpointer=cp)


def test_langgraph_full_successful_lifecycle(orchestrator):
    """Test full happy path: Observer -> Investigator -> Repair -> Pause -> Approve -> Sandbox -> Verifier -> Recovered."""
    inc_id = "INC-LG-001"
    
    # 1. Start workflow
    state = orchestrator.start_workflow(
        incident_id=inc_id,
        application="payment-gateway-svc",
        error_summary="NullPointerException at StripeWebhookHandler:142",
        logs=["[ERROR] NullPointerException dereferencing customer ID in webhook"],
        stack_trace="StripeWebhookHandler.java:142",
        allowed_paths=["src/main/java/billing/StripeWebhookHandler.java"],
        source_snippets={"src/main/java/billing/StripeWebhookHandler.java": "String customerId = payload.getCustomer().getId();"},
    )

    # 2. Verify pause at Human Approval checkpoint
    assert state["workflow_status"] == "patch_pending_approval"
    assert state["current_step"] == "human_gate"
    assert state["patch_proposal"] is not None
    assert state["patch_proposal"]["status"] == "pending"
    assert state["patch_id"] == "PAT-LG-001"
    assert state.get("sandbox_result") is None  # MUST NOT run sandbox before approval
    assert state.get("verification_result") is None  # MUST NOT run verification before approval

    # Verify agent logs recorded in repo
    logs = agent_log_repo.list_by_incident(inc_id)
    agent_names = [l["agent_name"] for l in logs]
    assert "Observer Agent" in agent_names
    assert "Investigator Agent" in agent_names
    assert "Repair Agent" in agent_names

    # 3. Resume with human approval
    resumed = orchestrator.submit_approval_and_resume(
        incident_id=inc_id,
        decision="approve",
        actor="Elena Vance (Staff SRE)",
        notes="Reviewed diff, defensive null-check approved.",
    )

    # 4. Verify sandbox executed, verifier ran, and recovery was declared
    assert resumed["workflow_status"] == "recovered"
    assert resumed["current_step"] == "completed"
    assert resumed["sandbox_result"] is not None
    assert resumed["sandbox_result"]["applied"] is True
    assert resumed["verification_result"] is not None
    assert resumed["verification_result"]["final_verification_result"] == "verified_recovery"

    # Verify Verifier Agent log was recorded
    updated_logs = agent_log_repo.list_by_incident(inc_id)
    updated_names = [l["agent_name"] for l in updated_logs]
    assert "Verifier Agent" in updated_names


def test_langgraph_human_rejection_lifecycle(orchestrator):
    """Test human rejection path: Observer -> Investigator -> Repair -> Pause -> Reject -> End without sandbox or verifier."""
    inc_id = "INC-LG-002"

    # 1. Start workflow up to gate
    state = orchestrator.start_workflow(
        incident_id=inc_id,
        application="auth-worker",
        error_summary="Redis connection timeout",
        logs=["[WARN] Pool connection timeout"],
        allowed_paths=["src/auth/RedisConfig.java"],
        source_snippets={"src/auth/RedisConfig.java": "RedisPool pool = new RedisPool();"},
    )

    assert state["workflow_status"] == "patch_pending_approval"

    # 2. Human Operator rejects patch
    resumed = orchestrator.submit_approval_and_resume(
        incident_id=inc_id,
        decision="reject",
        actor="Elena Vance (Staff SRE)",
        notes="Patch does not address cluster fallback. Rejected.",
    )

    # 3. Verify workflow terminated as rejected without executing sandbox or verifier
    assert resumed["workflow_status"] == "rejected"
    assert resumed["current_step"] == "completed_rejected"
    assert resumed.get("sandbox_result") is None  # MUST NOT run sandbox
    assert resumed.get("verification_result") is None  # MUST NOT run verifier


def test_langgraph_verification_failure_lifecycle(orchestrator):
    """Test verification failure: Observer -> Investigator -> Repair -> Approve -> Sandbox -> Verifier Fails -> Failed (NOT recovered)."""
    inc_id = "INC-LG-003"

    # 1. Start workflow up to gate
    state = orchestrator.start_workflow(
        incident_id=inc_id,
        application="billing-service",
        error_summary="ArithmeticException: Divide by zero",
        logs=["[ERROR] Divide by zero in calculation handler"],
        allowed_paths=["src/billing/Calc.java"],
        source_snippets={"src/billing/Calc.java": "return total / count;"},
    )

    assert state["workflow_status"] == "patch_pending_approval"

    # 2. Human approves, but verification fails during test execution
    resumed = orchestrator.submit_approval_and_resume(
        incident_id=inc_id,
        decision="approve",
        actor="Elena Vance (Staff SRE)",
        notes="Approved for test run.",
        simulate_verification_failure=True,
    )

    # 3. Verify final status is failed, NOT recovered
    assert resumed["workflow_status"] == "failed"
    assert resumed["current_step"] == "completed"
    assert resumed["verification_result"]["final_verification_result"] == "failed"
    assert resumed["workflow_status"] != "recovered"


def test_langgraph_error_node_on_missing_evidence():
    """Verify conditional edge routes to error_node when evidence collection fails."""
    nodes = LangGraphOrchestratorNodes()
    app = build_sentinelmesh_graph(nodes)

    # Missing error_summary and bad state
    state = {
        "incident_id": "INC-LG-ERR",
        "error": "Forced observer error",
    }

    result = app.invoke(state, config={"configurable": {"thread_id": "INC-LG-ERR"}})
    assert result["workflow_status"] == "failed"
    assert result["current_step"] == "completed_error"
