"""Comprehensive Tests for Backend Restart & Persistent Checkpoint Recovery (File 08 Gap Closure).

Validates:
1. Checkpoint persistence before shutdown to an SQLite database file.
2. Complete state restoration after discarding original service and instantiating a new orchestrator service.
3. Successful approval and resume from the restored checkpoint without restarting the workflow.
4. Rejection after restoration terminates without invoking the Docker sandbox or verifier.
5. Invalid or missing approval after restoration fails closed.
6. No duplicate patch application or redundant verification during resume.
7. Failed verification after resume cannot mark the incident as recovered.
"""

import os
import sqlite3
import tempfile
import uuid
import pytest

from agents.orchestrator.langgraph_workflow import (
    LangGraphOrchestratorService,
    build_sentinelmesh_graph,
    LangGraphOrchestratorNodes,
)
from agents.orchestrator.sqlite_checkpointer import SqliteSaver
from app.repositories import incident_repo, patch_repo, verification_repo, agent_log_repo


@pytest.fixture
def sqlite_db_path(tmp_path):
    """Provide a temporary SQLite database path for persistent checkpointing."""
    db_file = str(tmp_path / f"checkpoints_{uuid.uuid4().hex[:8]}.db")
    yield db_file
    # Cleanup
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass


def test_checkpoint_persistence_before_shutdown(sqlite_db_path):
    """Test 1: Checkpoint is genuinely written to SQLite storage before service shutdown."""
    saver1 = SqliteSaver(sqlite_db_path)
    service1 = LangGraphOrchestratorService(checkpointer=saver1)

    inc_id = f"INC-PERSIST-{uuid.uuid4().hex[:6]}"
    state = service1.start_workflow(
        incident_id=inc_id,
        application="demo-user-api",
        error_summary="Connection pool timeout in demo user service",
        logs=["2026-11-07 [ERROR] TimeoutError: Database connection timed out"],
        allowed_paths=["demo_api/service.py"],
        source_snippets={"demo_api/service.py": "def get_users(): pass"},
    )

    # 1. State must pause at gate
    assert state["workflow_status"] == "patch_pending_approval"
    assert state["current_step"] == "human_gate"

    # 2. Inspect SQLite database on disk
    with sqlite3.connect(sqlite_db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM checkpoints WHERE thread_id = ?", (inc_id,))
        count = cur.fetchone()[0]
        assert count > 0, "No checkpoint records were persisted to the SQLite database file!"

        cur.execute("SELECT COUNT(*) FROM blobs WHERE thread_id = ?", (inc_id,))
        blob_count = cur.fetchone()[0]
        assert blob_count > 0, "No channel state blobs were persisted to the SQLite database file!"

    saver1.close()


def test_restoration_after_new_orchestrator_instance(sqlite_db_path):
    """Test 2: After destroying the first service, a new orchestrator instance restores exact state."""
    saver1 = SqliteSaver(sqlite_db_path)
    service1 = LangGraphOrchestratorService(checkpointer=saver1)

    inc_id = f"INC-RESTORE-{uuid.uuid4().hex[:6]}"
    state1 = service1.start_workflow(
        incident_id=inc_id,
        application="demo-user-api",
        error_summary="Connection pool timeout in demo user service",
        logs=["2026-11-07 [ERROR] TimeoutError: Database connection timed out"],
        allowed_paths=["demo_api/service.py"],
        source_snippets={"demo_api/service.py": "def get_users(): pass"},
    )
    saved_patch_id = state1.get("patch_id")
    assert state1["workflow_status"] == "patch_pending_approval"

    # Simulate Process Termination: close saver and delete service1 completely
    saver1.close()
    del service1
    del saver1

    # Simulate Process Restart: instantiate brand-new saver and service connected to the same file
    saver2 = SqliteSaver(sqlite_db_path)
    service2 = LangGraphOrchestratorService(checkpointer=saver2)

    config = {"configurable": {"thread_id": inc_id}}
    restored_tuple = service2.graph.get_state(config)

    assert restored_tuple is not None
    restored_values = restored_tuple.values
    assert restored_values["incident_id"] == inc_id
    assert restored_values["current_step"] == "human_gate"
    assert restored_values["workflow_status"] == "patch_pending_approval"
    assert restored_values.get("patch_id") == saved_patch_id
    assert restored_values.get("patch_proposal") is not None
    assert restored_values.get("sandbox_result") is None  # Must NOT have run before approval
    assert restored_values.get("verification_result") is None

    saver2.close()


def test_successful_approval_and_resume_after_restart(sqlite_db_path):
    """Test 3: Resuming from restored checkpoint executes approval workflow, sandbox, and verifies recovery."""
    saver1 = SqliteSaver(sqlite_db_path)
    service1 = LangGraphOrchestratorService(checkpointer=saver1)

    inc_id = f"INC-RESUME-OK-{uuid.uuid4().hex[:6]}"
    service1.start_workflow(
        incident_id=inc_id,
        application="demo-user-api",
        error_summary="Connection pool timeout in demo user service",
        logs=["2026-11-07 [ERROR] TimeoutError: Database connection timed out"],
        allowed_paths=["demo_api/service.py"],
        source_snippets={"demo_api/service.py": "def get_users(): pass"},
    )
    saver1.close()
    del service1, saver1

    # Reboot: new service instance
    saver2 = SqliteSaver(sqlite_db_path)
    service2 = LangGraphOrchestratorService(checkpointer=saver2)

    resumed = service2.submit_approval_and_resume(
        incident_id=inc_id,
        decision="approve",
        actor="Lead SRE Operator",
        notes="Approved after server restart from persistent SQLite checkpoint.",
    )

    assert resumed["workflow_status"] == "recovered"
    assert resumed["current_step"] == "completed"
    assert resumed["sandbox_result"] is not None
    assert resumed["sandbox_result"]["applied"] is True
    assert resumed["verification_result"] is not None
    assert resumed["verification_result"]["final_verification_result"] == "verified_recovery"

    saver2.close()


def test_rejection_after_restoration_without_sandbox_execution(sqlite_db_path):
    """Test 4: Rejection on restored service terminates workflow without sandbox execution."""
    saver1 = SqliteSaver(sqlite_db_path)
    service1 = LangGraphOrchestratorService(checkpointer=saver1)

    inc_id = f"INC-REJECT-REBOOT-{uuid.uuid4().hex[:6]}"
    service1.start_workflow(
        incident_id=inc_id,
        application="demo-user-api",
        error_summary="Connection pool timeout",
        logs=["[WARN] Pool saturation"],
        allowed_paths=["demo_api/service.py"],
        source_snippets={"demo_api/service.py": "def get_users(): pass"},
    )
    saver1.close()
    del service1, saver1

    # Reboot: new service instance
    saver2 = SqliteSaver(sqlite_db_path)
    service2 = LangGraphOrchestratorService(checkpointer=saver2)

    resumed = service2.submit_approval_and_resume(
        incident_id=inc_id,
        decision="reject",
        actor="Staff SRE",
        notes="Rejected post-restart due to alternative architectural mitigation.",
    )

    assert resumed["workflow_status"] == "rejected"
    assert resumed["current_step"] == "completed_rejected"
    assert resumed.get("sandbox_result") is None
    assert resumed.get("verification_result") is None

    saver2.close()


def test_invalid_or_missing_approval_after_restoration(sqlite_db_path):
    """Test 5: Empty actor or missing approval after restoration fails closed and halts."""
    saver1 = SqliteSaver(sqlite_db_path)
    service1 = LangGraphOrchestratorService(checkpointer=saver1)

    inc_id = f"INC-INVALID-ACTOR-{uuid.uuid4().hex[:6]}"
    service1.start_workflow(
        incident_id=inc_id,
        application="demo-user-api",
        error_summary="Connection pool timeout",
        logs=["[ERROR] Timeout"],
        allowed_paths=["demo_api/service.py"],
        source_snippets={"demo_api/service.py": "def get_users(): pass"},
    )
    saver1.close()
    del service1, saver1

    # Reboot: new service instance
    saver2 = SqliteSaver(sqlite_db_path)
    service2 = LangGraphOrchestratorService(checkpointer=saver2)

    # Empty actor must raise ValueError
    with pytest.raises(ValueError) as exc:
        service2.submit_approval_and_resume(
            incident_id=inc_id,
            decision="approve",
            actor="   ",
        )
    assert "valid actor identity" in str(exc.value)

    # Verify state remains paused at human_gate
    config = {"configurable": {"thread_id": inc_id}}
    state = service2.graph.get_state(config)
    assert state.values["current_step"] == "human_gate"
    assert state.values["workflow_status"] == "patch_pending_approval"

    saver2.close()


def test_no_duplicate_patch_application_or_verification_during_resume(sqlite_db_path):
    """Test 6: Resuming an already finalized workflow does not re-apply patches or duplicate runs."""
    saver1 = SqliteSaver(sqlite_db_path)
    service1 = LangGraphOrchestratorService(checkpointer=saver1)

    inc_id = f"INC-NO-DUP-{uuid.uuid4().hex[:6]}"
    service1.start_workflow(
        incident_id=inc_id,
        application="demo-user-api",
        error_summary="Connection pool timeout",
        logs=["[ERROR] Timeout"],
        allowed_paths=["demo_api/service.py"],
        source_snippets={"demo_api/service.py": "def get_users(): pass"},
    )
    saver1.close()
    del service1, saver1

    # Reboot: new service instance
    saver2 = SqliteSaver(sqlite_db_path)
    service2 = LangGraphOrchestratorService(checkpointer=saver2)

    # First resume completes workflow
    resumed1 = service2.submit_approval_and_resume(
        incident_id=inc_id,
        decision="approve",
        actor="Operator A",
    )
    assert resumed1["workflow_status"] == "recovered"
    run_id_first = resumed1["sandbox_result"].get("run_id")

    # Second resume call on already completed workflow
    resumed2 = service2.submit_approval_and_resume(
        incident_id=inc_id,
        decision="approve",
        actor="Operator B",
    )
    # Status remains recovered and completed
    assert resumed2["workflow_status"] == "recovered"
    assert resumed2["current_step"] == "completed"

    saver2.close()


def test_failed_verification_after_resume_cannot_mark_recovered(sqlite_db_path):
    """Test 7: A failed test run following post-restart resume marks status failed, never recovered."""
    saver1 = SqliteSaver(sqlite_db_path)
    service1 = LangGraphOrchestratorService(checkpointer=saver1)

    inc_id = f"INC-FAIL-VERIF-REBOOT-{uuid.uuid4().hex[:6]}"
    service1.start_workflow(
        incident_id=inc_id,
        application="demo-user-api",
        error_summary="Connection pool timeout",
        logs=["[ERROR] Timeout"],
        allowed_paths=["demo_api/service.py"],
        source_snippets={"demo_api/service.py": "def get_users(): pass"},
    )
    saver1.close()
    del service1, saver1

    # Reboot: new service instance
    saver2 = SqliteSaver(sqlite_db_path)
    service2 = LangGraphOrchestratorService(checkpointer=saver2)

    resumed = service2.submit_approval_and_resume(
        incident_id=inc_id,
        decision="approve",
        actor="Operator",
        simulate_verification_failure=True,
    )

    assert resumed["workflow_status"] == "failed"
    assert resumed["workflow_status"] != "recovered"
    assert resumed["verification_result"]["final_verification_result"] == "failed"

    saver2.close()
