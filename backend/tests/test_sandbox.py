r"""Comprehensive Test Suite for Sandbox Implementation (06_SANDBOX_IMPLEMENTATION.md).

Tests:
1. Unapproved patch rejection (Security gate).
2. Human-rejected patch rejection.
3. Path traversal attack prevention (../../etc/passwd, ..\System32).
4. Non-allowlisted file modification prevention.
5. Oversized patch rejection (> limits).
6. Successful patch application and verification.
7. Failed test execution handling (Incident NOT recovered).
8. Timeout handling and process termination (Incident NOT recovered).
9. Workspace destruction and cleanup.
10. Host repository file isolation (host files untouched).
"""

import os
import pytest
from sandbox.validator import PatchValidator, PatchValidationError, PERMITTED_FILE_ALLOWLIST
from sandbox.workspace import SandboxWorkspace, DEMO_API_SERVICE_UNPATCHED
from sandbox.execution import SandboxRunner, SandboxService, sandbox_service
from sandbox.models import SandboxExecutionResult


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

    res = service.execute_patch_verification(
        incident_id="INC-999",
        patch_data=patch_data,
        human_approval={"decision": "rejected", "actor": "Staff SRE"},
        persist_results=False,
    )

    assert res.status == "failed"
    assert "Human approval decision was 'rejected'" in res.error
    assert res.cleaned_up is True


# 3. Test path traversal sequences are rejected
@pytest.mark.parametrize("malicious_path", [
    "../../etc/passwd",
    "..\\..\\Windows\\System32\\cmd.exe",
    "demo_api/../../../shadow",
    "../demo_api/service.py",
    "demo_api/./../../outside.py",
    "/etc/hosts",
    "C:\\Windows\\win.ini",
    "demo_api/\0service.py",
])
def test_path_traversal_prevention(malicious_path):
    validator = PatchValidator()
    with pytest.raises(PatchValidationError) as exc:
        validator.validate_path(malicious_path)
    assert any(term in str(exc.value) for term in ["traversal", "prohibited", "illegal", "not in the permitted"])


# 4. Test non-allowlisted file cannot be modified
def test_non_allowlisted_file_rejected():
    validator = PatchValidator()
    with pytest.raises(PatchValidationError) as exc:
        validator.validate_path("backend/app/main.py")
    assert "not in the permitted sandbox allowlist" in str(exc.value)


# 5. Test oversized patch rejection
def test_oversized_patch_rejected():
    validator = PatchValidator()
    huge_diff = "\n".join([f"+ line {i}" for i in range(300)])
    patch_data = {
        "file_path": "demo_api/service.py",
        "diff": huge_diff,
    }
    with pytest.raises(PatchValidationError) as exc:
        validator.validate_patch(patch_data, human_approval={"decision": "approved"})
    assert "exceeds maximum limit" in str(exc.value)


# 6. Test successful patch execution in disposable workspace
def test_successful_sandbox_execution():
    service = SandboxService(default_timeout=15)
    # Valid defensive patch that resolves the connection pool saturation failure
    good_patch = """
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    # Fixed: gracefully returns replica data even when connections reach max limit
    return [
        {"id": 1, "username": "admin", "status": "active"},
        {"id": 2, "username": "elena_v", "status": "active"}
    ]
"""
    patch_data = {
        "id": "PAT-TEST-SUCCESS",
        "file_path": "demo_api/service.py",
        "diff": good_patch,
    }

    res = service.execute_patch_verification(
        incident_id="INC-TEST-01",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "Elena Vance"},
        timeout_seconds=10,
        persist_results=False,
    )

    assert res.status == "passed"
    assert res.exit_code == 0
    assert res.passed_count >= 2
    assert res.failed_count == 0
    assert res.cleaned_up is True
    assert len(res.tests) >= 2


# 7. Test failed patch execution handling (Incident NOT recovered)
def test_failed_sandbox_execution():
    service = SandboxService(default_timeout=15)
    # Failing patch: deliberately introduces a runtime crash
    failing_patch = """
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    raise AssertionError("Regression failure: database schema corrupted")
"""
    patch_data = {
        "id": "PAT-TEST-FAIL",
        "file_path": "demo_api/service.py",
        "diff": failing_patch,
    }

    res = service.execute_patch_verification(
        incident_id="INC-TEST-02",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "Elena Vance"},
        timeout_seconds=10,
        persist_results=False,
    )

    assert res.status == "failed"
    assert res.exit_code != 0
    assert res.failed_count >= 1
    assert res.cleaned_up is True


# 8. Test timeout handling and process termination
def test_sandbox_timeout_handling():
    service = SandboxService(default_timeout=2)
    # Patch that introduces an infinite loop
    loop_patch = """
import time
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    while True:
        time.sleep(0.5)
"""
    patch_data = {
        "id": "PAT-TEST-TIMEOUT",
        "file_path": "demo_api/service.py",
        "diff": loop_patch,
    }

    res = service.execute_patch_verification(
        incident_id="INC-TEST-03",
        patch_data=patch_data,
        human_approval={"decision": "approved", "actor": "Elena Vance"},
        timeout_seconds=2,
        persist_results=False,
    )

    assert res.status == "timed_out"
    assert res.exit_code == 124
    assert res.timed_out is True
    assert "timed out" in res.error.lower()
    assert res.cleaned_up is True


# 9. Test disposable workspace cleanup
def test_sandbox_workspace_cleanup():
    workspace = SandboxWorkspace()
    workspace_path = workspace.create()

    assert os.path.isdir(workspace_path)
    assert os.path.exists(os.path.join(workspace_path, "demo_api", "service.py"))

    # Cleanup
    workspace.cleanup()
    assert not os.path.exists(workspace_path)


# 10. Test host filesystem isolation (host files remain untouched)
def test_host_filesystem_isolation():
    # Verify that executing a patch in the sandbox does not create or alter any files in current project dir
    baseline_files = set(os.listdir("."))
    service = SandboxService()

    patch_data = {
        "id": "PAT-ISOLATION",
        "file_path": "demo_api/service.py",
        "diff": "def get_users(): return []",
    }

    res = service.execute_patch_verification(
        incident_id="INC-ISOLATION",
        patch_data=patch_data,
        human_approval={"decision": "approved"},
        persist_results=False,
    )

    current_files = set(os.listdir("."))
    assert baseline_files == current_files, "Sandbox execution leaked files into root project directory!"
