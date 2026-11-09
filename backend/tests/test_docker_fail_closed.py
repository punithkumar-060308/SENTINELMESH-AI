r"""Regression Test Suite for Docker Fail-Closed Verification (P0 Security Audit Fix).
Proves that an incident can NEVER be marked recovered or pass verification
when Docker Engine is unavailable, emulated, or offline, regardless of .target_patch presence.
"""

import os
import shutil
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from datetime import datetime, timezone
from sandbox.execution import SandboxRunner, SandboxService
from sandbox.models import SandboxExecutionResult
from app.services.verification_service import VerificationService
from app.repositories import incident_repo, patch_repo, verification_repo


@pytest.fixture
def clean_repos():
    # Reset repositories to clean initial test state before and after test
    incident_repo.reset_for_tests()
    patch_repo.reset_for_tests()
    verification_repo.reset_for_tests()
    yield
    incident_repo.reset_for_tests()
    patch_repo.reset_for_tests()
    verification_repo.reset_for_tests()


def test_docker_unavailable_fails_closed():
    """1. Docker Engine unavailable returns explicit failure with fail-closed properties."""
    runner = SandboxRunner()
    with tempfile.TemporaryDirectory() as temp_ws:
        with patch.object(runner, "check_docker_engine", return_value=(False, "Docker daemon not responding")):
            res = runner.run_trusted_suite(temp_ws, timeout_seconds=5)

            assert res["exit_code"] == 1
            assert res["passed"] == 0
            assert res["failed"] == 1
            assert res["docker_unavailable"] is True
            assert res["docker_isolated"] is False
            assert res["container_name"] is None
            assert "Docker Engine unavailable (fail-closed)" in res["error"]
            assert res["tests"] == []


def test_target_patch_marker_ignored_when_docker_unavailable():
    """2. .target_patch existence MUST NOT fabricate test passes when Docker is offline."""
    runner = SandboxRunner()
    with tempfile.TemporaryDirectory() as temp_ws:
        # Create .target_patch marker
        marker_path = os.path.join(temp_ws, ".target_patch")
        with open(marker_path, "w") as f:
            f.write("target patched content")

        with patch.object(runner, "check_docker_engine", return_value=(False, "Docker socket /var/run/docker.sock missing")):
            res = runner.run_trusted_suite(temp_ws, timeout_seconds=5)

            assert res["exit_code"] == 1
            assert res["passed"] == 0
            assert res["failed"] == 1
            assert res["docker_unavailable"] is True
            assert res["docker_isolated"] is False
            assert res["container_name"] is None
            assert "Docker Engine unavailable (fail-closed)" in res["error"]


def test_emulated_container_id_rejected_by_verification_service(clean_repos):
    """3. VerificationService strictly rejects emulated or fabricated container IDs."""
    service = VerificationService()

    # Seed incident and approved patch
    incident_id = "INC-FAILCLOSED-01"
    patch_id = "PAT-FAILCLOSED-01"
    now_iso = datetime.now(timezone.utc).isoformat()
    incident_repo.create({
        "id": incident_id,
        "title": "Test Deadlock",
        "status": "approved",
        "approved_by": "Lead SRE",
        "approved_at": now_iso,
    })
    patch_repo.create({
        "id": patch_id,
        "incident_id": incident_id,
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
        "decision": "approved",
        "status": "approved",
        "actor": "Lead SRE",
        "approved_by": "Lead SRE",
        "decided_at": now_iso,
    })

    # Mock SandboxService returning an emulated container ID
    now_iso = "2026-11-09T10:00:00Z"
    fake_sandbox_result = SandboxExecutionResult(
        runId="VR-EMULATED-01",
        incidentId=incident_id,
        patchId=patch_id,
        startedAt=now_iso,
        containerId="sentinelmesh-sandbox-emulated-a1b2c3d4e5f6",
        status="passed",
        passedCount=3,
        failedCount=0,
        skippedCount=0,
        durationMs=420,
        stdoutSummary="PASSED 3 tests",
        stderrSummary="",
        timedOut=False,
        dockerIsolated=True,
        isolatedEnv="emulated",
        tests=[],
        error=None,
    )

    with patch.object(service.sandbox, "execute_patch_verification", return_value=fake_sandbox_result):
        res = service.run_verification(incident_id=incident_id, patch_id=patch_id)

        # Verification must NOT pass because container ID is emulated
        assert res.status == "failed"
        updated_incident = incident_repo.get_by_id(incident_id)
        assert updated_incident["status"] != "recovered"


def test_docker_timeout_fails_closed(clean_repos):
    """4. Docker timeout strictly marks verification and incident as failed."""
    service = VerificationService()

    incident_id = "INC-TIMEOUT-01"
    patch_id = "PAT-TIMEOUT-01"
    now_iso = datetime.now(timezone.utc).isoformat()
    incident_repo.create({
        "id": incident_id,
        "title": "Test Timeout",
        "status": "approved",
        "approved_by": "Lead SRE",
        "approved_at": now_iso,
    })
    patch_repo.create({
        "id": patch_id,
        "incident_id": incident_id,
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
        "decision": "approved",
        "status": "approved",
        "actor": "Lead SRE",
        "approved_by": "Lead SRE",
        "decided_at": now_iso,
    })

    now_iso = "2026-11-09T10:00:00Z"
    timeout_result = SandboxExecutionResult(
        runId="VR-TIMEOUT-01",
        incidentId=incident_id,
        patchId=patch_id,
        startedAt=now_iso,
        containerId="sentinelmesh-sandbox-timeout123",
        status="timed_out",
        passedCount=0,
        failedCount=1,
        skippedCount=0,
        durationMs=15000,
        stdoutSummary="",
        stderrSummary="Container killed after timeout",
        timedOut=True,
        dockerIsolated=True,
        isolatedEnv="docker",
        tests=[],
        error="Execution timed out after 15s",
    )

    with patch.object(service.sandbox, "execute_patch_verification", return_value=timeout_result):
        res = service.run_verification(incident_id=incident_id, patch_id=patch_id)

        assert res.status == "failed"
        updated_incident = incident_repo.get_by_id(incident_id)
        assert updated_incident["status"] != "recovered"


def test_passing_docker_execution_succeeds(clean_repos):
    """5. Actual genuine Docker execution with passing tests successfully marks recovered."""
    service = VerificationService()

    incident_id = "INC-REAL-PASS-01"
    patch_id = "PAT-REAL-PASS-01"
    now_iso = datetime.now(timezone.utc).isoformat()
    incident_repo.create({
        "id": incident_id,
        "title": "Test Real Pass",
        "status": "approved",
        "approved_by": "Lead SRE",
        "approved_at": now_iso,
    })
    patch_repo.create({
        "id": patch_id,
        "incident_id": incident_id,
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
        "decision": "approved",
        "status": "approved",
        "actor": "Lead SRE",
        "approved_by": "Lead SRE",
        "decided_at": now_iso,
    })

    now_iso = "2026-11-09T10:00:00Z"
    genuine_pass_result = SandboxExecutionResult(
        runId="VR-GENUINE-01",
        incidentId=incident_id,
        patchId=patch_id,
        startedAt=now_iso,
        containerId="sentinelmesh-sandbox-c8a7f21e09b1",
        status="passed",
        exitCode=0,
        passedCount=3,
        failedCount=0,
        skippedCount=0,
        durationMs=640,
        stdoutSummary="3 passed in 0.64s",
        stderrSummary="",
        timedOut=False,
        dockerIsolated=True,
        isolatedEnv="mesh-sandbox-isolated (Docker rootless)",
        tests=[{"name": "test_get_users", "status": "PASSED"}],
        error=None,
    )

    with patch.object(service.sandbox, "execute_patch_verification", return_value=genuine_pass_result):
        res = service.run_verification(incident_id=incident_id, patch_id=patch_id)

        assert res.status == "passed"
        assert res.passed == 3
        assert res.failed == 0
        updated_incident = incident_repo.get_by_id(incident_id)
        assert updated_incident["status"] == "recovered"


def test_failing_docker_execution_fails(clean_repos):
    """6. Genuine Docker execution with failing tests marks status failed."""
    service = VerificationService()

    incident_id = "INC-REAL-FAIL-01"
    patch_id = "PAT-REAL-FAIL-01"
    now_iso = datetime.now(timezone.utc).isoformat()
    incident_repo.create({
        "id": incident_id,
        "title": "Test Real Fail",
        "status": "approved",
        "approved_by": "Lead SRE",
        "approved_at": now_iso,
    })
    patch_repo.create({
        "id": patch_id,
        "incident_id": incident_id,
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
        "decision": "approved",
        "status": "approved",
        "actor": "Lead SRE",
        "approved_by": "Lead SRE",
        "decided_at": now_iso,
    })

    now_iso = "2026-11-09T10:00:00Z"
    genuine_fail_result = SandboxExecutionResult(
        runId="VR-GENUINE-02",
        incidentId=incident_id,
        patchId=patch_id,
        startedAt=now_iso,
        containerId="sentinelmesh-sandbox-b5e19a4301fa",
        status="failed",
        exitCode=1,
        passedCount=1,
        failedCount=2,
        skippedCount=0,
        durationMs=750,
        stdoutSummary="1 passed, 2 failed in 0.75s",
        stderrSummary="",
        timedOut=False,
        dockerIsolated=True,
        isolatedEnv="mesh-sandbox-isolated (Docker rootless)",
        tests=[{"name": "test_get_users", "status": "FAILED"}],
        error="Test suite failed with 2 errors",
    )

    with patch.object(service.sandbox, "execute_patch_verification", return_value=genuine_fail_result):
        res = service.run_verification(incident_id=incident_id, patch_id=patch_id)

        assert res.status == "failed"
        assert res.passed == 1
        assert res.failed == 2
        updated_incident = incident_repo.get_by_id(incident_id)
        assert updated_incident["status"] != "recovered"


def test_repository_seeds_restored_between_tests(clean_repos):
    """7. Verifies that clean_repos fixture guarantees seed records exist regardless of test order."""
    # Ensure default seeds are present
    assert incident_repo.get_by_id("INC-8921") is not None
    assert incident_repo.get_by_id("INC-001") is not None
    assert patch_repo.get_by_id("PAT-8921") is not None

    # Mutate state by adding a temporary incident and modifying an existing one
    incident_repo.create({"id": "INC-POISON", "title": "Poison Pill", "status": "detected"})
    incident_repo.update("INC-8921", {"status": "recovered"})
    assert incident_repo.get_by_id("INC-POISON") is not None
    assert incident_repo.get_by_id("INC-8921")["status"] == "recovered"

    # Reset repository state for tests
    incident_repo.reset_for_tests()
    patch_repo.reset_for_tests()

    # Verify initial clean state restored
    assert incident_repo.get_by_id("INC-POISON") is None
    assert incident_repo.get_by_id("INC-8921")["status"] == "awaiting_approval"
    assert incident_repo.get_by_id("INC-001")["status"] == "detected"


def test_strict_allowlist_rejects_arbitrary_code_files():
    """8. Verifies validator rejects files outside allowlist even with valid programming extensions."""
    from sandbox.validator import PatchValidator, PatchValidationError
    validator = PatchValidator()
    approval = {"decision": "approved", "actor": "Lead SRE", "timestamp": datetime.now(timezone.utc).isoformat()}

    disallowed_files = [
        "backend/app/main.py",
        "demo_api/server_core.py",
        "src/main/ArbitraryService.java",
        "scripts/deploy.ts",
        "schema/drop_tables.sql",
    ]

    for file_path in disallowed_files:
        with pytest.raises(PatchValidationError) as exc:
            validator.validate_patch({"file_path": file_path, "diff": "+ def foo(): pass"}, human_approval=approval)
        assert "not in the permitted sandbox allowlist" in str(exc.value)


def test_strict_allowlist_accepts_explicitly_allowlisted_files():
    """9. Verifies validator accepts files explicitly present in PERMITTED_FILE_ALLOWLIST."""
    from sandbox.validator import PatchValidator
    validator = PatchValidator()
    approval = {"decision": "approved", "actor": "Lead SRE", "timestamp": datetime.now(timezone.utc).isoformat()}

    allowed_files = [
        "demo_api/service.py",
        "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java",
        "src/main/services/inventory-sync-db/Handler.java",
    ]

    for file_path in allowed_files:
        res = validator.validate_patch({"file_path": file_path, "diff": "def foo(): pass"}, human_approval=approval)
        assert res.is_valid is True
        assert res.target_file == file_path


def test_workspace_rejects_missing_snapshot_file():
    """10. Verifies workspace.apply_patch raises FileNotFoundError if target is absent in snapshot."""
    from sandbox.workspace import SandboxWorkspace
    ws = SandboxWorkspace()
    try:
        ws.create()
        with pytest.raises(FileNotFoundError) as exc:
            ws.apply_patch("non_existent_folder/missing_service.py", "def foo(): pass")
        assert "does not exist in workspace snapshot" in str(exc.value)
    finally:
        ws.cleanup()
