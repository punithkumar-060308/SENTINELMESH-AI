import pytest
from app.repositories import patch_repo, incident_repo, verification_repo, audit_repo
from sandbox.models import SandboxExecutionResult
from sandbox import sandbox_service


def test_run_verification(client):
    # Ensure incident is in approved state
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    # Trigger verification
    verif_res = client.post("/api/incidents/INC-8921/verify", json={
        "isolatedEnv": "mesh-sandbox-isolated (Docker rootless)"
    })
    assert verif_res.status_code == 200
    data = verif_res.json()
    assert data["status"] == "passed"
    assert data["passed"] > 0
    assert data["failed"] == 0
    assert len(data["tests"]) > 0
    assert "RegressionTest" in data["tests"][0]["name"]

    # Verify incident state is now recovered
    inc_res = client.get("/api/incidents/INC-8921")
    assert inc_res.json()["status"] == "recovered"


def test_list_verification_runs(client):
    res = client.get("/api/verification-runs")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "environment" in data[0]


def test_get_single_verification_run(client):
    res = client.get("/api/verification-runs/VR-101")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "VR-101"
    assert data["incidentId"] == "INC-8921"


# --- Regression Tests for File 06 Verification Service Enhancements ---

# 1. Patch selection: supplied but not found returns HTTP 404, never silently selects another patch
def test_supplied_patch_not_found_returns_404(client):
    # Ensure incident exists
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    res = client.post("/api/incidents/INC-8921/verify", json={
        "patchId": "PAT-NONEXISTENT-999"
    })
    assert res.status_code == 404
    err_text = (res.json().get("detail") or res.json().get("message") or "").lower()
    assert "not found" in err_text


# 1b. Patch selection: ambiguous patch selection rejected
def test_ambiguous_patch_selection_rejected(client):
    # Ensure incident is approved
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    # Create a second approved patch for INC-8921
    patch_repo.create({
        "id": "PAT-8921-ALT",
        "incident_id": "INC-8921",
        "file_path": "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java",
        "diff": "// Alt patch diff",
        "status": "approved",
        "decision": "approved",
        "actor": "Human Operator",
        "approved_by": "Human Operator",
        "decided_at": "2026-11-07T12:00:00Z",
    })

    try:
        # Call verify without patchId
        res = client.post("/api/incidents/INC-8921/verify", json={})
        assert res.status_code == 400
        err_text = (res.json().get("detail") or res.json().get("message") or "").lower()
        assert "ambiguous patch selection" in err_text
    finally:
        # Cleanup
        if "PAT-8921-ALT" in patch_repo._memory_store:
            del patch_repo._memory_store["PAT-8921-ALT"]


# 2. Patch ownership: reject mismatches before any sandbox execution
def test_patch_ownership_mismatch_rejected(client):
    patch_repo.create({
        "id": "PAT-OWNERSHIP-TEST",
        "incident_id": "INC-DIFFERENT-999",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): pass",
        "status": "approved",
        "decision": "approved",
        "actor": "Human Operator",
        "approved_by": "Human Operator",
        "decided_at": "2026-11-07T12:00:00Z",
    })

    res = client.post("/api/incidents/INC-8921/verify", json={
        "patchId": "PAT-OWNERSHIP-TEST"
    })
    assert res.status_code == 400
    err_text = (res.json().get("detail") or res.json().get("message") or "").lower()
    assert "does not belong to incident" in err_text


# 3. Approval authenticity: unauthenticated approval rejected (actor without workflow approval)
def test_unauthenticated_approval_rejected(client):
    # Create incident that is NOT approved
    incident_repo.create({
        "id": "INC-UNAUTH-TEST",
        "title": "Unapproved incident",
        "status": "investigating",
    })
    patch_repo.create({
        "id": "PAT-UNAUTH-TEST",
        "incident_id": "INC-UNAUTH-TEST",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): pass",
        "status": "approved",
        "decision": "approved",
        "actor": "Arbitrary Client Actor",  # Non-empty actor, but no authenticated workflow
        "decided_at": "2026-11-06T10:00:00Z",
    })

    res = client.post("/api/incidents/INC-UNAUTH-TEST/verify", json={
        "patchId": "PAT-UNAUTH-TEST"
    })
    assert res.status_code == 400
    err_text = (res.json().get("detail") or res.json().get("message") or "").lower()
    assert "not authenticated through the authorized approval workflow" in err_text


# 3b. Approval authenticity: future timestamp rejected
def test_future_timestamp_rejected(client):
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})
    # Tamper patch decided_at to a distant future year
    patch_repo.update("PAT-8921", {"decided_at": "2099-01-01T00:00:00Z"})

    res = client.post("/api/incidents/INC-8921/verify", json={"patchId": "PAT-8921"})
    assert res.status_code == 400
    err_text = (res.json().get("detail") or res.json().get("message") or "").lower()
    assert "invalid" in err_text or "future" in err_text

    # Reset
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})


# 3c. Approval authenticity: actor mismatch rejected
def test_actor_mismatch_rejected(client):
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve", "actor": "Authenticated SRE"})
    # Tamper patch actor to a different arbitrary text
    patch_repo.update("PAT-8921", {"actor": "Arbitrary Impersonator", "approved_by": "Arbitrary Impersonator"})

    res = client.post("/api/incidents/INC-8921/verify", json={"patchId": "PAT-8921"})
    assert res.status_code == 400
    err_text = (res.json().get("detail") or res.json().get("message") or "").lower()
    assert "does not match authenticated incident approval actor" in err_text

    # Reset
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})


# 3d. Approval authenticity: normalized decision handling
def test_decision_normalization_approved(client):
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})
    patch_repo.update("PAT-8921", {"decision": "  APPROVED  "})

    res = client.post("/api/incidents/INC-8921/verify", json={"patchId": "PAT-8921"})
    assert res.status_code == 200
    assert res.json()["status"] == "passed"
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})


# 4. Exception handling: Docker unavailable transitions incident to failed, never stuck in verifying
def test_docker_unavailable_marks_incident_failed(client, monkeypatch):
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    # Simulate Docker unavailable
    monkeypatch.setattr(sandbox_service.runner, "check_docker_engine", lambda: (False, "Docker daemon unavailable test"))

    res = client.post("/api/incidents/INC-8921/verify", json={"patchId": "PAT-8921"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "failed"

    # Incident must NOT be verifying, must be failed
    inc = client.get("/api/incidents/INC-8921").json()
    assert inc["status"] == "failed"
    assert inc["status"] != "verifying"
    assert inc["status"] != "recovered"


# 4b. Exception handling: Execution exception marks incident failed and persists failed run
def test_execution_exception_marks_incident_failed(client, monkeypatch):
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    # Simulate unexpected execution exception
    def raise_err(*args, **kwargs):
        raise RuntimeError("Unexpected container subprocess crash")
    monkeypatch.setattr(sandbox_service, "execute_patch_verification", raise_err)

    res = client.post("/api/incidents/INC-8921/verify", json={"patchId": "PAT-8921"})
    assert res.status_code == 500

    # Incident must be failed, NOT stuck in verifying
    inc = client.get("/api/incidents/INC-8921").json()
    assert inc["status"] == "failed"
    assert inc["status"] != "verifying"


# 4c. Exception handling: Verification persistence failure blocks recovery
def test_persistence_failure_blocks_recovery(client, monkeypatch):
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    # Simulate verif_repo failure
    def fail_create(*args, **kwargs):
        raise RuntimeError("Database write failure during verification create")
    monkeypatch.setattr(verification_repo, "create", fail_create)

    res = client.post("/api/incidents/INC-8921/verify", json={"patchId": "PAT-8921"})
    assert res.status_code == 500

    # Incident must NOT be recovered!
    inc = client.get("/api/incidents/INC-8921").json()
    assert inc["status"] == "failed"
    assert inc["status"] != "recovered"


# 5. Result integrity: applied_at not set if application was not confirmed
def test_applied_at_not_set_if_application_unconfirmed(client, monkeypatch):
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    # Mock execute_patch_verification to return success but empty changed_files (no application confirmed)
    real_exec = sandbox_service.execute_patch_verification
    def mock_no_apply(*args, **kwargs):
        res = real_exec(*args, **kwargs)
        res.changed_files = []  # unconfirmed application
        return res
    monkeypatch.setattr(sandbox_service, "execute_patch_verification", mock_no_apply)

    # Clear applied_at first
    patch_repo.update("PAT-8921", {"applied_at": None})

    res = client.post("/api/incidents/INC-8921/verify", json={"patchId": "PAT-8921"})
    assert res.status_code == 200

    p = patch_repo.get_by_id("PAT-8921")
    assert p.get("applied_at") is None, "applied_at was set even though patch application was unconfirmed!"
