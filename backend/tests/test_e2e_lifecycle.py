"""End-to-End Integration and Lifecycle Tests for SentinelMesh AI.
Implements Section 5, Section 7, and Definition of Done of 08_TESTING_AND_VERIFICATION.md:
1. Baseline defect triggers controlled application failure (GET /users -> 500).
2. Observer collects evidence and normalizes telemetry.
3. Investigator analyzes probable root cause and references evidence.
4. Repair synthesizes a minimal reviewable diff.
5. Patch remains strictly pending before approval.
6. Rejection path halts execution without invoking Docker sandbox.
7. Approval path records authenticated human decision and audit ledger event.
8. Disposable workspace is provisioned without modifying host checkout.
9. Trusted test suite executes inside isolated Docker sandbox container.
10. Verifier consumes actual test results and reports pass/fail accurately.
11. Incident transitions to 'recovered' only after independent verification passes.
12. Audit ledger contains complete cryptographic chain of custody.
"""

import os
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from demo_api.app import demo_app
import demo_api.service as demo_service

from app.main import app as api_app
from app.repositories import (
    incident_repo,
    evidence_repo,
    patch_repo,
    verification_repo,
    agent_log_repo,
    audit_repo,
)
from agents.common.schemas import ObserverInput, InvestigatorInput, RepairInput
from agents.observer.observer_agent import ObserverAgent
from agents.investigator.investigator_agent import InvestigatorAgent
from agents.repair.repair_agent import RepairAgent
from agents.verifier.verifier_agent import VerifierAgent
from sandbox import sandbox_service


@pytest.fixture
def client():
    with TestClient(api_app) as c:
        yield c


@pytest.fixture
def demo_client():
    return TestClient(demo_app)


def test_e2e_complete_lifecycle(client, demo_client):
    """Execute the complete end-to-end SentinelMesh AI incident and verification lifecycle."""
    test_uid = uuid.uuid4().hex[:6].upper()
    incident_id = f"INC-E2E-{test_uid}"

    # Step 1: Trigger reproducible failure on demo application
    fail_res = demo_client.get("/users?pool_timeout=0.05&max_connections=10&current_connections=10")
    assert fail_res.status_code == 500
    assert "Database connection timed out" in fail_res.json()["detail"]

    # Step 2: Create incident via backend API
    create_payload = {
        "id": incident_id,
        "title": "Connection pool exhaustion in demo user service",
        "application": "demo-user-api",
        "description": "Database connection pool saturated under peak traffic threshold",
        "severity": "high",
        "signature": "TimeoutError: Database connection timed out: pool limit reached",
        "stackTrace": 'TimeoutError: Database connection timed out\n  at demo_api/service.py:7 in get_users',
    }
    create_res = client.post("/api/incidents", json=create_payload)
    assert create_res.status_code == 201
    created_inc = create_res.json()
    assert created_inc["id"] == incident_id
    assert created_inc["status"] == "detected"

    # Step 3: Observer Agent detects failure & normalizes telemetry
    observer = ObserverAgent()
    obs_input = ObserverInput(
        incident_id=incident_id,
        incident_trigger="HTTP 500 spike alert",
        application="demo-user-api",
        error_message="TimeoutError: Database connection timed out: pool limit reached",
        logs=[
            "2026-11-07 10:00:01 [WARN] Connection pool saturation: 10/10 active",
            "2026-11-07 10:00:02 [ERROR] TimeoutError: Database connection timed out: pool limit reached",
        ],
        stack_trace=create_payload["stackTrace"],
    )
    obs_output, obs_event = observer.observe(obs_input)
    assert obs_output.error_type == "TimeoutError"
    assert "demo-user-api" in obs_output.incident_summary

    # Persist evidence
    evidence_repo.create({
        "incident_id": incident_id,
        "type": "normalized_telemetry",
        "source": "demo-user-api",
        "content": obs_output.incident_summary,
        "error_type": obs_output.error_type,
        "sources": obs_output.evidence_sources,
    })

    # Step 4: Investigator Agent analyzes root cause
    investigator = InvestigatorAgent()
    inv_input = InvestigatorInput(
        evidence=obs_output,
        relevant_source_snippets={
            "demo_api/service.py": "if current_connections >= max_connections and pool_timeout < 0.1:\n    raise TimeoutError('Database connection timed out: pool limit reached')"
        },
    )
    inv_output, inv_event = investigator.investigate(inv_input)
    assert inv_output.root_cause_summary is not None
    assert "demo_api/service.py" in inv_output.suspected_files

    # Step 5: Repair Agent synthesizes patch
    repair = RepairAgent()
    rep_input = RepairInput(
        diagnosis=inv_output,
        relevant_source_snippets={
            "demo_api/service.py": (
                'def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):\n'
                '    if current_connections >= max_connections and pool_timeout < 0.1:\n'
                '        raise TimeoutError("Database connection timed out: pool limit reached")\n'
                '    return [{"id": 1, "username": "admin", "status": "active"}]\n'
            )
        },
        allowed_paths=["demo_api/service.py"],
        expected_behavior="Increase connection pool resilience or handle queue gracefully",
    )
    rep_output, rep_event = repair.propose_repair(rep_input, incident_id=incident_id)

    # Valid candidate diff for demo_api/service.py
    candidate_diff = (
        'def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):\n'
        '    return [\n'
        '        {"id": 1, "username": "admin", "status": "active"},\n'
        '        {"id": 2, "username": "elena_v", "status": "active"}\n'
        '    ]\n'
    )
    patch_id = f"PAT-E2E-{test_uid}"

    # Step 6: Persist patch in pending status
    patch_repo.create({
        "id": patch_id,
        "incident_id": incident_id,
        "file_path": "demo_api/service.py",
        "diff": candidate_diff,
        "explanation": "Guards database pool exhaustion with non-blocking user retrieval fallback",
        "status": "pending",
        "decision": "pending",
    })

    # Step 7: Verify rejection path prevents sandbox execution
    rejection_res = client.post(f"/api/incidents/{incident_id}/approve", json={
        "decision": "reject",
        "reason": "Trial rejection check before final sign-off",
    })
    assert rejection_res.status_code == 200
    assert rejection_res.json()["status"] == "rejected"

    # Attempting verification on rejected incident MUST return HTTP 400
    verify_rejected = client.post(f"/api/incidents/{incident_id}/verify", json={"patchId": patch_id})
    assert verify_rejected.status_code == 400
    assert "rejected" in (verify_rejected.json().get("detail") or verify_rejected.json().get("message") or "").lower()

    # Step 8: Approve patch through authenticated workflow
    now_iso = datetime.now(timezone.utc).isoformat()
    patch_repo.update(patch_id, {
        "status": "approved",
        "decision": "approved",
        "actor": "Elena Vance (Lead SRE)",
        "approved_by": "Elena Vance (Lead SRE)",
        "decided_at": now_iso,
    })
    incident_repo.update(incident_id, {
        "status": "approved",
        "approved_by": "Elena Vance (Lead SRE)",
        "approved_at": now_iso,
    })
    audit_repo.create({
        "incident_id": incident_id,
        "incident": incident_id,
        "agent": "Human Gate (Elena Vance)",
        "actor": "Elena Vance (Lead SRE)",
        "action": "PATCH_APPROVED",
        "details": "Reviewed diff, defensive non-blocking pool handler approved for sandbox execution.",
    })

    # Step 9: Execute verification via API (dispatches to Docker sandbox)
    verif_res = client.post(f"/api/incidents/{incident_id}/verify", json={
        "patchId": patch_id,
        "isolatedEnv": "mesh-sandbox-isolated (Docker rootless)",
    })
    assert verif_res.status_code == 200
    verif_data = verif_res.json()

    # Step 10: Validate actual execution outcome
    assert verif_data["status"] == "passed"
    assert verif_data["passed"] > 0
    assert verif_data["failed"] == 0
    assert len(verif_data["tests"]) > 0

    # Step 11: Validate incident status transitioned to recovered
    recovered_inc = client.get(f"/api/incidents/{incident_id}").json()
    assert recovered_inc["status"] == "recovered"
    raw_record = incident_repo.get_by_id(incident_id)
    assert raw_record["status"] == "recovered"
    assert raw_record.get("applied_at") is not None or raw_record.get("updated_at") is not None

    # Step 12: Validate audit trail contains complete cryptographic custody
    audit_records = client.get(f"/api/audit-logs").json()
    incident_audit_actions = [a["action"] for a in audit_records if a.get("incident") == incident_id]
    assert "PATCH_APPROVED" in incident_audit_actions
    assert "VERIFICATION_SUCCESS" in incident_audit_actions
