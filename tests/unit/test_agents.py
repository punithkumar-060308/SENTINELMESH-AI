"""Unit tests for SentinelMesh AI Agents and Orchestrator.
Tests valid, malformed, permission-gated, and failure paths.
Adheres to 04_AI_AGENTS_IMPLEMENTATION.md.
"""

import pytest
from agents.common.schemas import (
    ObserverInput,
    InvestigatorInput,
    RepairInput,
    VerifierInput,
    WorkflowState,
)
from agents.observer.observer_agent import ObserverAgent
from agents.investigator.investigator_agent import InvestigatorAgent
from agents.repair.repair_agent import RepairAgent, DiffValidationError
from agents.repair.diff_validator import validate_target_path, validate_unified_diff
from agents.verifier.verifier_agent import VerifierAgent, VerificationPermissionError
from agents.verifier.test_runner import TrustedSandboxTestRunner
from agents.orchestrator.workflow import SentinelMeshOrchestrator


# ---------------------------------------------------------------------------
# 1. Observer Agent Tests
# ---------------------------------------------------------------------------
def test_observer_agent_valid_evidence():
    """Verify observer agent extracts error type, summarizes incident, and emits event."""
    agent = ObserverAgent()
    data = ObserverInput(
        incident_id="INC-101",
        incident_trigger="Synthetic HTTP 500 spike",
        application="payment-gateway-svc",
        error_message="NullPointerException at StripeWebhookHandler.java:142",
        logs=[
            "2026-11-06 09:41:20 [INFO] Processing webhook event",
            "2026-11-06 09:41:22 [ERROR] NullPointerException: getCustomer() returned null",
        ],
        stack_trace="java.lang.NullPointerException\n\tat com.sentinelmesh.billing.StripeWebhookHandler.process(StripeWebhookHandler.java:142)",
    )

    output, event = agent.observe(data)

    assert output.error_type == "NullPointerException"
    assert "payment-gateway-svc" in output.incident_summary
    assert len(output.relevant_log_excerpts) >= 1
    assert "stack_trace" in output.evidence_sources
    assert "application_logs" in output.evidence_sources
    assert "health_check_metrics_missing" in output.missing_evidence_list
    assert event.agent_name == "Observer Agent"
    assert event.action == "INCIDENT_OBSERVED"


def test_observer_agent_missing_data_marked_missing():
    """Verify observer agent marks missing evidence rather than fabricating it."""
    agent = ObserverAgent()
    data = ObserverInput(
        incident_id="INC-102",
        incident_trigger="Healthcheck failure alert",
        application="auth-worker",
        error_message="Connection timed out",
        logs=[],
        stack_trace=None,
    )

    output, event = agent.observe(data)

    assert "application_logs_missing" in output.missing_evidence_list
    assert "stack_trace_missing" in output.missing_evidence_list
    assert output.stack_trace_reference is None


# ---------------------------------------------------------------------------
# 2. Investigator Agent Tests
# ---------------------------------------------------------------------------
def test_investigator_agent_diagnosis_grounding():
    """Verify investigator grounds diagnosis in evidence and does not invent files."""
    obs_agent = ObserverAgent()
    inv_agent = InvestigatorAgent()

    obs_data = ObserverInput(
        incident_id="INC-201",
        incident_trigger="Crash in billing worker",
        application="billing-service",
        error_message="NullPointerException: customer is null",
        logs=["[ERROR] NullPointerException at StripeWebhookHandler:142"],
        stack_trace="StripeWebhookHandler.java:142",
    )
    evidence, _ = obs_agent.observe(obs_data)

    source_snippets = {
        "src/main/java/billing/StripeWebhookHandler.java": (
            "String customerId = payload.getCustomer().getId();\n"
            "billingService.record(customerId);"
        )
    }

    inv_input = InvestigatorInput(
        evidence=evidence,
        relevant_source_snippets=source_snippets,
    )

    diagnosis, event = inv_agent.investigate(inv_input, incident_id="INC-201")

    assert diagnosis.root_cause_summary is not None
    assert diagnosis.confidence > 0.0
    assert "Model-estimated" in diagnosis.confidence_label
    assert diagnosis.suspected_files == ["src/main/java/billing/StripeWebhookHandler.java"]
    assert event.agent_name == "Investigator Agent"
    assert event.action == "ROOT_CAUSE_ISOLATED"


def test_investigator_agent_detects_missing_context():
    """Verify investigator flags missing source code context."""
    obs_agent = ObserverAgent()
    inv_agent = InvestigatorAgent()

    obs_data = ObserverInput(
        incident_id="INC-202",
        incident_trigger="Unknown crash",
        application="demo-app",
        error_message="Fatal crash",
    )
    evidence, _ = obs_agent.observe(obs_data)

    inv_input = InvestigatorInput(
        evidence=evidence,
        relevant_source_snippets={},  # No source provided
    )

    diagnosis, _ = inv_agent.investigate(inv_input, incident_id="INC-202")
    assert "source_code_context_missing" in diagnosis.missing_information


# ---------------------------------------------------------------------------
# 3. Repair Agent Tests
# ---------------------------------------------------------------------------
def test_repair_agent_valid_patch_generation():
    """Verify repair agent synthesizes a valid diff with pending status."""
    obs_agent = ObserverAgent()
    inv_agent = InvestigatorAgent()
    rep_agent = RepairAgent()

    obs_data = ObserverInput(
        incident_id="INC-301",
        incident_trigger="NullPointer trigger",
        application="billing-service",
        error_message="NullPointerException",
    )
    evidence, _ = obs_agent.observe(obs_data)

    target_file = "src/main/java/billing/StripeWebhookHandler.java"
    source_snippets = {target_file: "String customerId = payload.getCustomer().getId();"}

    inv_input = InvestigatorInput(evidence=evidence, relevant_source_snippets=source_snippets)
    diagnosis, _ = inv_agent.investigate(inv_input)

    rep_input = RepairInput(
        diagnosis=diagnosis,
        relevant_source_snippets=source_snippets,
        allowed_paths=[target_file],
    )

    patch, event = rep_agent.propose_repair(rep_input, incident_id="INC-301")

    assert patch.target_file == target_file
    assert patch.status == "pending"  # Must remain pending
    assert "--- a/" in patch.diff
    assert "+++ b/" in patch.diff
    assert "@@" in patch.diff
    assert event.agent_name == "Repair Agent"
    assert event.action == "PATCH_SYNTHESIZED"


def test_repair_agent_enforces_allowlist():
    """Verify repair agent raises an error when allowed_paths is empty."""
    rep_agent = RepairAgent()
    obs_agent = ObserverAgent()
    inv_agent = InvestigatorAgent()

    evidence, _ = obs_agent.observe(ObserverInput(
        incident_trigger="t", application="app", error_message="err"
    ))
    diagnosis, _ = inv_agent.investigate(InvestigatorInput(evidence=evidence))

    with pytest.raises(DiffValidationError):
        rep_agent.propose_repair(RepairInput(
            diagnosis=diagnosis,
            relevant_source_snippets={},
            allowed_paths=[],  # Empty allowlist
        ))


def test_diff_validator_rejects_malformed_diff():
    """Verify deterministic validator rejects malformed diffs and path traversals."""
    # Path traversal
    assert not validate_target_path("../secrets.env", ["src/Handler.java"])
    assert not validate_target_path("/etc/passwd", ["src/Handler.java"])

    # Valid path
    assert validate_target_path("src/Handler.java", ["src/Handler.java"])

    # Malformed diff
    is_valid, msg = validate_unified_diff("just some random text without headers")
    assert not is_valid
    assert "lacks valid unified diff hunk header" in msg


# ---------------------------------------------------------------------------
# 4. Verifier Agent Tests
# ---------------------------------------------------------------------------
def test_verifier_agent_blocks_unapproved_patch():
    """Verify verifier agent refuses to execute when patch is unapproved."""
    agent = VerifierAgent()
    data = VerifierInput(
        incident_id="INC-401",
        patch_id="PAT-401",
        human_approval={"decision": "rejected"},  # Rejected
    )

    with pytest.raises(VerificationPermissionError):
        agent.verify(data)


def test_verifier_agent_successful_verification():
    """Verify verifier declares verified_recovery when 100% tests pass."""
    agent = VerifierAgent()
    data = VerifierInput(
        incident_id="INC-402",
        patch_id="PAT-402",
        human_approval={"decision": "approved", "actor": "Elena Vance"},
    )

    output, event = agent.verify(data, mock_synthetic_success=True)

    assert output.test_run_status == "passed"
    assert output.exit_code == 0
    assert output.passed == 14
    assert output.failed == 0
    assert output.original_failure_resolved is True
    assert output.regression_tests_passed is True
    assert output.final_verification_result == "verified_recovery"
    assert event.action == "VERIFICATION_SUCCESS"


def test_verifier_agent_failed_verification():
    """Verify verifier declares failed when tests fail."""
    agent = VerifierAgent()
    data = VerifierInput(
        incident_id="INC-403",
        patch_id="PAT-403",
        human_approval={"decision": "approved", "actor": "Elena Vance"},
    )

    output, event = agent.verify(data, mock_synthetic_failure=True)

    assert output.test_run_status == "failed"
    assert output.exit_code == 1
    assert output.failed > 0
    assert output.final_verification_result == "failed"
    assert event.action == "VERIFICATION_FAILED"


# ---------------------------------------------------------------------------
# 5. Multi-Agent Orchestrator Pipeline Tests
# ---------------------------------------------------------------------------
def test_orchestrator_autonomous_pipeline_halts_at_gate():
    """Verify orchestrator runs up to Repair and pauses at Human Gate."""
    orch = SentinelMeshOrchestrator()

    trigger = ObserverInput(
        incident_id="INC-8921",
        incident_trigger="Stripe Webhook Dereference",
        application="payment-gateway-svc",
        error_message="NullPointerException at StripeWebhookHandler:142",
        logs=["[ERROR] NullPointerException dereferencing customer"],
        stack_trace="StripeWebhookHandler.java:142",
    )

    allowed = ["src/main/java/billing/StripeWebhookHandler.java"]
    snippets = {allowed[0]: "String customerId = payload.getCustomer().getId();"}

    state = orch.run_autonomous_pipeline_until_gate(
        trigger_input=trigger,
        source_snippets=snippets,
        allowed_paths=allowed,
    )

    # Must pause at Human Gate
    assert state.workflow_status == "patch_pending_approval"
    assert state.current_step == "human_gate"
    assert state.patch is not None
    assert state.patch.status == "pending"
    assert len(state.agent_events) == 3  # Observer, Investigator, Repair


def test_orchestrator_human_approval_and_verification_recovery():
    """Verify full end-to-end lifecycle with human approval and verified recovery."""
    orch = SentinelMeshOrchestrator()

    trigger = ObserverInput(
        incident_id="INC-8921",
        incident_trigger="Stripe Webhook Dereference",
        application="payment-gateway-svc",
        error_message="NullPointerException",
    )
    allowed = ["src/main/java/billing/StripeWebhookHandler.java"]
    snippets = {allowed[0]: "payload.getCustomer().getId();"}

    state = orch.run_autonomous_pipeline_until_gate(trigger, snippets, allowed)

    # 1. Human Operator signs off
    state = orch.submit_human_decision(
        state,
        decision="approve",
        actor="Elena Vance (Staff SRE)",
        notes="Code change verified safe.",
    )
    assert state.workflow_status == "approved"
    assert state.human_decision["decision"] == "approved"

    # 2. Execute verification
    state = orch.verify_and_finalize(state, mock_synthetic_success=True)
    assert state.workflow_status == "recovered"
    assert state.verification.final_verification_result == "verified_recovery"
    assert len(state.agent_events) == 5  # Observer, Investigator, Repair, Human Gate, Verifier
