r"""Comprehensive Test Suite for Docker Sandbox Subsystem (File 06).
Tests actual Docker execution boundaries, fail-closed policies, security constraints,
container lifecycle, network isolation, host filesystem isolation, and failure handling.
"""

import os
import subprocess
import pytest
from pathlib import Path

from sandbox.validator import PatchValidator, PatchValidationError, PERMITTED_FILE_ALLOWLIST
from sandbox.workspace import SandboxWorkspace, DEMO_API_SERVICE_UNPATCHED
from sandbox.execution import SandboxRunner, SandboxService, sandbox_service, DOCKER_IMAGE_NAME
from sandbox.models import SandboxExecutionResult
from app.repositories import patch_repo


def seed_test_patch(
    patch_id: str,
    incident_id: str,
    file_path: str = "demo_api/service.py",
    diff: str = "def get_users(): pass",
    decision: str = "approved",
    actor: str = "Authorized SRE Operator",
    timestamp: str = "2026-11-07T12:00:00Z",
):
    patch_repo.create({
        "id": patch_id,
        "incident_id": incident_id,
        "file_path": file_path,
        "diff": diff,
        "explanation": "Test patch record",
        "status": decision,
        "decision": decision,
        "actor": actor,
        "approved_by": actor,
        "decided_at": timestamp,
    })


# 1. Test unapproved patch cannot reach sandbox
def test_unapproved_patch_rejected():
    validator = PatchValidator()
    patch_data = {
        "file_path": "demo_api/service.py",
        "diff": "+ def get_users(): return []\n- def old(): pass"
    }

    # Missing approval object
    with pytest.raises(PatchValidationError) as exc:
        validator.validate_patch(patch_data, human_approval=None)
    assert "No recorded human approval object" in str(exc.value)

    # Empty decision
    with pytest.raises(PatchValidationError) as exc:
        validator.validate_patch(patch_data, human_approval={"decision": ""})
    assert "required 'approved'" in str(exc.value)


# 2. Test human-rejected patch cannot reach sandbox
def test_rejected_patch_cannot_reach_sandbox():
    service = SandboxService()
    patch_data = {
        "id": "PAT-999",
        "file_path": "demo_api/service.py",
        "diff": "+ def test(): pass\n- def old(): pass"
    }
    seed_test_patch("PAT-999", "INC-999", patch_data["file_path"], patch_data["diff"], decision="rejected", actor="Staff SRE")

    res = service.execute_patch_verification(
        incident_id="INC-999",
        patch_data=patch_data,
        human_approval={"decision": "rejected", "actor": "Staff SRE", "timestamp": "2026-11-07T12:00:00Z"},
        persist_results=False,
    )

    assert res.status == "failed"
    assert "rejected" in res.error.lower() or "unapproved" in res.error.lower()


# 3. Test path traversal attacks are rejected
@pytest.mark.parametrize("malicious_path", [
    "../../etc/passwd",
    r"..\..\Windows\System32\cmd.exe",
    "demo_api/../../../shadow",
    "../demo_api/service.py",
    "demo_api/./../../outside.py",
    "/etc/hosts",
    "C:\\Windows\\win.ini",
    "demo_api/\x00service.py",
])
def test_path_traversal_prevention(malicious_path):
    validator = PatchValidator()
    patch_data = {
        "file_path": malicious_path,
        "diff": "+ malicious code injected",
    }
    approval = {"decision": "approved", "actor": "Admin", "timestamp": "2026-11-07T12:00:00Z"}

    with pytest.raises(PatchValidationError):
        validator.validate_patch(patch_data, human_approval=approval)


# 4. Test non-allowlisted file cannot be modified
def test_non_allowlisted_file_rejected():
    validator = PatchValidator()
    patch_data = {
        "file_path": "backend/app/main.py",
        "diff": "+ print('malicious')",
    }
    approval = {"decision": "approved", "actor": "Admin", "timestamp": "2026-11-07T12:00:00Z"}

    with pytest.raises(PatchValidationError) as exc:
        validator.validate_patch(patch_data, human_approval=approval)
    assert "not in the permitted sandbox allowlist" in str(exc.value)


# 5. Test oversized patch rejected
def test_oversized_patch_rejected():
    validator = PatchValidator()
    huge_diff = "\n".join([f"+ line_{i} = {i}" for i in range(300)])
    patch_data = {
        "file_path": "demo_api/service.py",
        "diff": huge_diff,
    }
    approval = {"decision": "approved", "actor": "Admin", "timestamp": "2026-11-07T12:00:00Z"}

    with pytest.raises(PatchValidationError) as exc:
        validator.validate_patch(patch_data, human_approval=approval)
    assert "exceeds maximum limit" in str(exc.value)


# 6. Test Docker Engine unavailable fails closed
def test_docker_engine_unavailable_fails_closed(monkeypatch):
    """When Docker Engine is down or unreachable, fail-closed policy prohibits host execution."""
    runner = SandboxRunner()
    # Simulate Docker daemon offline
    monkeypatch.setattr(runner, "check_docker_engine", lambda: (False, "Docker daemon connection refused (npipe)"))

    res = runner.run_trusted_suite(workspace_dir=".")
    assert res["docker_unavailable"] is True
    assert res["docker_isolated"] is False
    assert res["exit_code"] == 1
    assert res["passed"] == 0
    assert "fail-closed" in res["error"].lower()


# 7. Test successful container execution in real Docker
def test_successful_container_execution():
    """Verify that a valid patch executes inside Docker, passes tests, and cleans up."""
    service = SandboxService()
    valid_patch = """
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    return [
        {"id": 1, "username": "admin", "status": "active"},
        {"id": 2, "username": "elena_v", "status": "active"}
    ]
"""
    patch_data = {
        "id": "PAT-TEST-SUCCESS",
        "file_path": "demo_api/service.py",
        "diff": valid_patch,
    }
    seed_test_patch("PAT-TEST-SUCCESS", "INC-TEST-01", patch_data["file_path"], patch_data["diff"], decision="approved", actor="SRE Operator")

    res = service.execute_patch_verification(
        incident_id="INC-TEST-01",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "SRE Operator", "timestamp": "2026-11-07T12:00:00Z"},
        timeout_seconds=15,
        persist_results=False,
    )

    assert res.status == "passed"
    assert res.docker_isolated is True
    assert res.exit_code == 0
    assert res.passed_count >= 1
    assert res.failed_count == 0
    assert len(res.tests) >= 1
    assert res.cleaned_up is True
    assert "mesh-docker-isolated" in res.isolated_env


# 8. Test failed regression in real Docker container
def test_failed_container_execution():
    """Verify that a patch causing test failure reports status='failed' without marking recovered."""
    service = SandboxService()
    failing_patch = """
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    raise AssertionError("Simulated regression bug")
"""
    patch_data = {
        "id": "PAT-TEST-FAIL",
        "file_path": "demo_api/service.py",
        "diff": failing_patch,
    }
    seed_test_patch("PAT-TEST-FAIL", "INC-TEST-02", patch_data["file_path"], patch_data["diff"], decision="approved", actor="SRE Operator")

    res = service.execute_patch_verification(
        incident_id="INC-TEST-02",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "SRE Operator", "timestamp": "2026-11-07T12:00:00Z"},
        timeout_seconds=15,
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.exit_code != 0
    assert res.failed_count >= 1
    assert res.cleaned_up is True


# 9. Test zero tests collected fails closed without synthetic results
def test_zero_tests_collected_fails():
    """Verify that if pytest collects 0 tests, it fails closed and never marks passed."""
    ws = SandboxWorkspace()
    try:
        ws_dir = ws.create()
        # Create an empty python file with no tests
        empty_test = os.path.join(ws_dir, "empty_test.py")
        with open(empty_test, "w", encoding="utf-8") as f:
            f.write("# No tests here\n")

        runner = SandboxRunner()
        res = runner.run_trusted_suite(workspace_dir=ws_dir, test_file="empty_test.py")

        assert res["passed"] == 0
        assert res["failed"] >= 1 or res["exit_code"] != 0
        assert res["tests"] == []  # Must NOT synthesize fake tests
        assert res["error"] is not None
    finally:
        ws.cleanup()


# 10. Test container timeout and termination in real Docker
def test_container_timeout_and_termination():
    """Verify that execution exceeding timeout terminates the container and removes it."""
    service = SandboxService(default_timeout=2)
    loop_patch = """
import time
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    while True:
        time.sleep(1)
"""
    patch_data = {
        "id": "PAT-TEST-TIMEOUT",
        "file_path": "demo_api/service.py",
        "diff": loop_patch,
    }
    seed_test_patch("PAT-TEST-TIMEOUT", "INC-TEST-03", patch_data["file_path"], patch_data["diff"], decision="approved", actor="SRE Operator")

    res = service.execute_patch_verification(
        incident_id="INC-TEST-03",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "SRE Operator", "timestamp": "2026-11-07T12:00:00Z"},
        timeout_seconds=2,
        persist_results=False,
    )

    assert res.status == "timed_out"
    assert res.exit_code == 124
    assert res.timed_out is True
    assert "timed out" in res.error.lower()
    assert res.cleaned_up is True


# 11. Test container cleanup after execution
def test_container_cleanup_after_run():
    """Verify that the Docker container is completely removed from the host engine after run."""
    runner = SandboxRunner()
    ws = SandboxWorkspace()
    try:
        ws_dir = ws.create()
        res = runner.run_trusted_suite(workspace_dir=ws_dir)
        container_name = res.get("container_name")

        if container_name:
            # Check docker ps -a
            check = subprocess.run(
                ["docker", "ps", "-a", "-f", f"name={container_name}", "-q"],
                capture_output=True,
                text=True,
            )
            assert check.stdout.strip() == "", f"Container {container_name} was not removed after run!"
    finally:
        ws.cleanup()


# 12. Test real Docker network isolation (--network none)
def test_container_network_isolation():
    """Verify that code executing in the container has zero network access (raises Network unreachable)."""
    probe_cmd = [
        "docker", "run", "--rm",
        "--network", "none",
        DOCKER_IMAGE_NAME,
        "python", "-c",
        "import socket; s = socket.socket(); s.settimeout(2); s.connect(('8.8.8.8', 53))",
    ]
    proc = subprocess.run(probe_cmd, capture_output=True, text=True)
    assert proc.returncode != 0
    assert "Network is unreachable" in (proc.stderr or proc.stdout)


# 13. Test real Docker host filesystem isolation
def test_container_no_host_filesystem_access():
    """Verify that the container cannot access the Windows host filesystem."""
    probe_cmd = [
        "docker", "run", "--rm",
        DOCKER_IMAGE_NAME,
        "python", "-c",
        "import os; print('HOST_ACCESSIBLE:', os.path.exists('/mnt/c/Windows') or os.path.exists('C:\\\\Windows'))",
    ]
    proc = subprocess.run(probe_cmd, capture_output=True, text=True)
    assert proc.returncode == 0
    assert "HOST_ACCESSIBLE: False" in proc.stdout


# 14. Test real Docker host secrets isolation
def test_container_no_host_secrets_exposed(monkeypatch):
    """Verify that host environment variables and secrets are not leaked into the container."""
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "sensitive-secret-token")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-private-token")

    probe_cmd = [
        "docker", "run", "--rm",
        DOCKER_IMAGE_NAME,
        "python", "-c",
        "import os; print('SECRET_FOUND:', 'AWS_SECRET_ACCESS_KEY' in os.environ or 'GEMINI_API_KEY' in os.environ)",
    ]
    proc = subprocess.run(probe_cmd, capture_output=True, text=True)
    assert proc.returncode == 0
    assert "SECRET_FOUND: False" in proc.stdout


# 15. Test real Docker read-only workspace mount
def test_container_readonly_workspace():
    """Verify that code in the container cannot write or tamper with the read-only mounted workspace."""
    ws = SandboxWorkspace()
    try:
        ws_dir = ws.create()
        probe_cmd = [
            "docker", "run", "--rm",
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
            "-v", f"{str(Path(ws_dir).resolve())}:/workspace:ro",
            "-w", "/workspace",
            DOCKER_IMAGE_NAME,
            "python", "-c",
            "open('/workspace/malicious.txt', 'w').write('tampered')",
        ]
        proc = subprocess.run(probe_cmd, capture_output=True, text=True)
        assert proc.returncode != 0
        assert "Read-only file system" in (proc.stderr or proc.stdout)
    finally:
        ws.cleanup()


# 16. Test disposable workspace cleanup
def test_sandbox_workspace_cleanup():
    workspace = SandboxWorkspace()
    workspace_path = workspace.create()

    assert os.path.isdir(workspace_path)
    assert os.path.exists(os.path.join(workspace_path, "demo_api", "service.py"))

    # Cleanup
    workspace.cleanup()
    assert not os.path.exists(workspace_path)


# 17. Test host filesystem isolation (host files remain untouched)
def test_host_filesystem_isolation():
    baseline_files = set(os.listdir("."))
    service = SandboxService()

    patch_data = {
        "id": "PAT-ISOLATION",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }
    seed_test_patch("PAT-ISOLATION", "INC-ISOLATION", patch_data["file_path"], patch_data["diff"], decision="approved", actor="SRE Operator")

    res = service.execute_patch_verification(
        incident_id="INC-ISOLATION",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "SRE Operator", "timestamp": "2026-11-07T12:00:00Z"},
        persist_results=False,
    )

    current_files = set(os.listdir("."))
    assert baseline_files == current_files, "Sandbox execution leaked files into root project directory!"


# 18. Test unpersisted patch fails closed immediately
def test_unpersisted_patch_rejected_fail_closed():
    """Verify that a patch without a persisted database record cannot be executed in the sandbox."""
    service = SandboxService()
    patch_data = {
        "id": "PAT-NONEXISTENT-9999",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }

    res = service.execute_patch_verification(
        incident_id="INC-NONEXISTENT",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "Attacker", "timestamp": "2026-11-07T12:00:00Z"},
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.docker_isolated is False
    assert "No persisted patch record found" in res.error


# 19. Test persisted patch with pending status fails closed
def test_persisted_patch_pending_rejected_fail_closed():
    """Verify that a patch with persisted 'pending' decision fails closed."""
    service = SandboxService()
    patch_data = {
        "id": "PAT-PENDING-CHECK",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }
    seed_test_patch("PAT-PENDING-CHECK", "INC-PENDING-CHECK", patch_data["file_path"], patch_data["diff"], decision="pending", actor="Operator")

    res = service.execute_patch_verification(
        incident_id="INC-PENDING-CHECK",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "Operator", "timestamp": "2026-11-07T12:00:00Z"},
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.docker_isolated is False
    assert "unapproved persisted decision" in res.error


# 20. Test persisted approval missing actor fails closed
def test_persisted_patch_missing_actor_rejected():
    """Verify that an approval record missing a valid actor fails closed."""
    service = SandboxService()
    patch_data = {
        "id": "PAT-NO-ACTOR",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }
    patch_repo.create({
        "id": "PAT-NO-ACTOR",
        "incident_id": "INC-NO-ACTOR",
        "file_path": patch_data["file_path"],
        "diff": patch_data["diff"],
        "status": "approved",
        "decision": "approved",
        "actor": "",
        "approved_by": "",
        "decided_at": "2026-11-07T12:00:00Z",
    })

    res = service.execute_patch_verification(
        incident_id="INC-NO-ACTOR",
        patch_data=patch_data,
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.docker_isolated is False
    assert "lacks a valid actor identity" in res.error


# 21. Test persisted approval missing timestamp fails closed
def test_persisted_patch_missing_timestamp_rejected():
    """Verify that an approval record missing a timestamp fails closed."""
    service = SandboxService()
    patch_data = {
        "id": "PAT-NO-TIMESTAMP",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }
    patch_repo.create({
        "id": "PAT-NO-TIMESTAMP",
        "incident_id": "INC-NO-TIMESTAMP",
        "file_path": patch_data["file_path"],
        "diff": patch_data["diff"],
        "status": "approved",
        "decision": "approved",
        "actor": "Human Operator",
        "approved_by": "Human Operator",
        "decided_at": "",
    })

    res = service.execute_patch_verification(
        incident_id="INC-NO-TIMESTAMP",
        patch_data=patch_data,
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.docker_isolated is False
    assert "lacks an approval timestamp" in res.error


# 22. Test patch incident mismatch fails closed
def test_persisted_patch_incident_mismatch_rejected():
    """Verify that a patch belonging to incident INC-A cannot be executed for incident INC-B."""
    service = SandboxService()
    patch_data = {
        "id": "PAT-MISMATCH",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }
    seed_test_patch("PAT-MISMATCH", "INC-A", patch_data["file_path"], patch_data["diff"], decision="approved", actor="Operator")

    res = service.execute_patch_verification(
        incident_id="INC-B",
        patch_data=patch_data,
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.docker_isolated is False
    assert "mismatch" in res.error.lower()


# 23. Test LangGraph state approval is not trusted without DB record
def test_langgraph_state_approval_not_trusted_without_db_record():
    """Verify that caller-supplied human_approval in LangGraph state does not bypass missing DB record."""
    service = SandboxService()
    patch_data = {
        "id": "PAT-SPOOFED-STATE",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }

    res = service.execute_patch_verification(
        incident_id="INC-SPOOFED",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "Spoofed Operator", "timestamp": "2026-11-07T12:00:00Z"},
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.docker_isolated is False
    assert "No persisted patch record found" in res.error


# 24. Test container ID is preserved separately and not overwritten by run ID
def test_container_id_preserved_not_overwritten_by_run_id():
    """Verify that sandbox execution preserves container_id separately from run_id."""
    service = SandboxService()
    valid_patch = """
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    return [
        {"id": 1, "username": "admin", "status": "active"},
        {"id": 2, "username": "elena_v", "status": "active"}
    ]
"""
    patch_data = {
        "id": "PAT-TEST-PRESERVE",
        "file_path": "demo_api/service.py",
        "diff": valid_patch,
    }
    seed_test_patch("PAT-TEST-PRESERVE", "INC-TEST-PRESERVE", patch_data["file_path"], patch_data["diff"], decision="approved", actor="SRE Operator")

    res = service.execute_patch_verification(
        incident_id="INC-TEST-PRESERVE",
        patch_data=patch_data,
        persist_results=False,
    )

    assert res.status == "passed"
    assert res.run_id.startswith("VR-")
    assert res.container_id is not None
    assert res.container_id.startswith("sentinelmesh-sandbox-")
    assert res.run_id != res.container_id


# 25. Test missing target file or diff content stops execution without fallback
def test_missing_target_file_or_diff_stops_execution_without_fallback():
    """Verify that sandbox_node aborts immediately without applying fallback demo patches."""
    from agents.orchestrator.langgraph_workflow import langgraph_orchestrator

    # State missing target file and diff
    state = {
        "incident_id": "INC-TEST-NO-DIFF",
        "workflow_status": "approved",
        "human_decision": {"decision": "approved", "actor": "SRE", "timestamp": "2026-11-07T12:00:00Z"},
        "patch_proposal": {},  # Missing target_file and diff
    }

    res = langgraph_orchestrator.nodes.sandbox_node(state)
    assert res["workflow_status"] == "failed"
    assert res["current_step"] == "sandbox_blocked"
    assert "Missing target file, patch ID, or diff content" in res["error"]


# 26. Test verification integrity requires passed > 0 and exit code 0
def test_verification_integrity_zero_passed_cannot_mark_recovered():
    """Verify that verifier_node will never mark an incident recovered on zero passed tests or non-zero exit."""
    from agents.orchestrator.langgraph_workflow import langgraph_orchestrator

    state_zero_passed = {
        "incident_id": "INC-VERIF-ZERO",
        "workflow_status": "verifying",
        "human_decision": {"decision": "approved", "actor": "SRE", "timestamp": "2026-11-07T12:00:00Z"},
        "sandbox_result": {
            "status": "passed",
            "docker_isolated": True,
            "exit_code": 0,
            "passed_count": 0,  # Zero passed tests!
            "failed_count": 0,
        },
    }

    res = langgraph_orchestrator.nodes.verifier_node(state_zero_passed)
    assert res["verification_result"]["final_verification_result"] == "failed"
    assert res["verification_result"]["test_run_status"] == "failed"

    # Finalize node must mark failed, never recovered
    final_res = langgraph_orchestrator.nodes.finalize_node(res)
    assert final_res["workflow_status"] == "failed"


# 27. Test unpatched snapshot file missing fails closed
def test_unpatched_snapshot_file_missing_fails_closed():
    """Verify that applying a patch to a non-existent file in snapshot raises FileNotFoundError."""
    ws = SandboxWorkspace()
    try:
        ws.create()
        with pytest.raises(FileNotFoundError) as exc:
            ws.apply_patch("non_existent_path/fake_service.py", "+ def foo(): pass")
        assert "does not exist in workspace snapshot" in str(exc.value)
    finally:
        ws.cleanup()


# 28. Test Docker memory limit enforcement (bounded OOM kill)
def test_container_memory_limit_enforcement():
    """Verify that a container exceeding its memory limit is safely terminated by Docker (exit code 137)."""
    cmd = [
        "docker", "run", "--rm",
        "--memory", "64m",
        DOCKER_IMAGE_NAME,
        "python", "-c", "a = bytearray(200 * 1024 * 1024)",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    assert proc.returncode == 137, f"Expected container to be killed by OOM (137), got {proc.returncode}"


# 29. Test Docker pids-limit enforcement (bounded process fork limit)
def test_container_pids_limit_enforcement():
    """Verify that a container exceeding pids-limit fails fork attempts cleanly without affecting host."""
    cmd = [
        "docker", "run", "--rm",
        "--pids-limit", "16",
        DOCKER_IMAGE_NAME,
        "python", "-c", "import os; [os.fork() for _ in range(20)]",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    assert proc.returncode != 0, "Expected container fork bomb attempt to fail"
    assert "blockingoserror" in proc.stderr.lower() or "temporarily unavailable" in proc.stderr.lower() or proc.returncode in [1, 137]
