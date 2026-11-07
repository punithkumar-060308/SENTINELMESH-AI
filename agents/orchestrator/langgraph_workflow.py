"""LangGraph-based Multi-Agent Orchestrator for SentinelMesh AI.
Implements 05_ORCHESTRATOR_LANGGRAPH.md.

Coordinates:
  START -> observer_node -> investigator_node -> repair_node ->
  human_approval_node (pause/gate) ->
    [if approved] -> sandbox_node -> verifier_node -> finalize_node -> END
    [if rejected] -> rejection_node -> END
    [if error]    -> error_node -> END

Reuses existing Observer, Investigator, Repair, and Verifier agents.
Persists workflow state, agent logs, and audit entries using database repositories.
"""

import os
import sys
import uuid
from typing import Dict, Any, List, Optional, TypedDict
from datetime import datetime, timezone

# Ensure backend directory is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from agents.orchestrator.sqlite_checkpointer import SqliteSaver

from agents.common.schemas import (
    ObserverInput,
    ObserverOutput,
    InvestigatorInput,
    InvestigatorOutput,
    RepairInput,
    RepairOutput,
    VerifierInput,
    VerifierOutput,
    AgentActivityEvent,
    current_utc_iso,
)
from agents.observer.observer_agent import ObserverAgent
from agents.investigator.investigator_agent import InvestigatorAgent
from agents.repair.repair_agent import RepairAgent, DiffValidationError
from agents.verifier.verifier_agent import VerifierAgent, VerificationPermissionError

# Repositories for state persistence
try:
    from app.repositories import (
        incident_repo,
        evidence_repo,
        patch_repo,
        verification_repo,
        agent_log_repo,
        audit_repo,
    )
except ImportError:
    incident_repo = None
    evidence_repo = None
    patch_repo = None
    verification_repo = None
    agent_log_repo = None
    audit_repo = None


# ---------------------------------------------------------------------------
# Typed Graph State
# ---------------------------------------------------------------------------
class OrchestratorGraphState(TypedDict, total=False):
    incident_id: str
    application: str
    error_summary: str
    logs: List[str]
    stack_trace: Optional[str]
    relevant_files: List[str]
    allowed_paths: List[str]
    source_snippets: Dict[str, str]
    evidence: Optional[Dict[str, Any]]
    investigation: Optional[Dict[str, Any]]
    patch_proposal: Optional[Dict[str, Any]]
    patch_id: Optional[str]
    human_decision: Optional[Dict[str, Any]]
    sandbox_result: Optional[Dict[str, Any]]
    verification_result: Optional[Dict[str, Any]]
    agent_events: List[Dict[str, Any]]
    workflow_status: str
    current_step: str
    error: Optional[str]
    simulate_verification_failure: Optional[bool]


# ---------------------------------------------------------------------------
# Node Implementations
# ---------------------------------------------------------------------------
class LangGraphOrchestratorNodes:
    """Encapsulates node execution logic for the LangGraph workflow."""

    def __init__(
        self,
        observer: Optional[ObserverAgent] = None,
        investigator: Optional[InvestigatorAgent] = None,
        repair: Optional[RepairAgent] = None,
        verifier: Optional[VerifierAgent] = None,
    ):
        self.observer = observer or ObserverAgent()
        self.investigator = investigator or InvestigatorAgent()
        self.repair = repair or RepairAgent()
        self.verifier = verifier or VerifierAgent()

    def observer_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Step 1: Observer Agent collects & normalizes telemetry evidence."""
        incident_id = state.get("incident_id") or f"INC-{uuid.uuid4().hex[:4].upper()}"
        events = list(state.get("agent_events") or [])

        try:
            obs_input = ObserverInput(
                incident_id=incident_id,
                incident_trigger=state.get("error_summary", "Anomaly trigger"),
                application=state.get("application", "unknown-service"),
                error_message=state.get("error_summary", "Unspecified error"),
                logs=state.get("logs") or [],
                stack_trace=state.get("stack_trace"),
            )

            output, event = self.observer.observe(obs_input)
            events.append(event.model_dump())

            # Persist evidence to repository if available
            if evidence_repo:
                try:
                    evidence_repo.create({
                        "incident_id": incident_id,
                        "type": "normalized_telemetry",
                        "source": state.get("application", "service"),
                        "content": output.incident_summary,
                        "error_type": output.error_type,
                        "sources": output.evidence_sources,
                    })
                except Exception:
                    pass

            # Persist agent log
            if agent_log_repo:
                try:
                    agent_log_repo.create({
                        "incident_id": incident_id,
                        "agent_name": "Observer Agent",
                        "status": "completed",
                        "input_summary": f"Observed {len(obs_input.logs)} log lines",
                        "output_summary": f"Detected {output.error_type}",
                    })
                except Exception:
                    pass

            return {
                **state,
                "incident_id": incident_id,
                "evidence": output.model_dump(),
                "workflow_status": "investigating",
                "current_step": "observer",
                "agent_events": events,
            }
        except Exception as exc:
            return {
                **state,
                "incident_id": incident_id,
                "error": f"Observer error: {str(exc)}",
                "workflow_status": "failed",
                "current_step": "observer_failed",
            }

    def investigator_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Step 2: Investigator Agent diagnoses probable root cause."""
        incident_id = state["incident_id"]
        events = list(state.get("agent_events") or [])

        if not state.get("evidence"):
            return {
                **state,
                "error": "Investigation aborted: missing observer evidence.",
                "workflow_status": "failed",
                "current_step": "investigator_failed",
            }

        try:
            ev_model = ObserverOutput.model_validate(state["evidence"])
            inv_input = InvestigatorInput(
                evidence=ev_model,
                relevant_source_snippets=state.get("source_snippets") or {},
                application_context={"application": state.get("application")},
            )

            output, event = self.investigator.investigate(inv_input, incident_id=incident_id)
            events.append(event.model_dump())

            if agent_log_repo:
                try:
                    agent_log_repo.create({
                        "incident_id": incident_id,
                        "agent_name": "Investigator Agent",
                        "status": "completed",
                        "input_summary": f"Analyzed evidence for {ev_model.error_type}",
                        "output_summary": output.root_cause_summary[:200],
                    })
                except Exception:
                    pass

            return {
                **state,
                "investigation": output.model_dump(),
                "relevant_files": output.suspected_files,
                "workflow_status": "investigating",
                "current_step": "investigator",
                "agent_events": events,
            }
        except Exception as exc:
            return {
                **state,
                "error": f"Investigator error: {str(exc)}",
                "workflow_status": "failed",
                "current_step": "investigator_failed",
            }

    def repair_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Step 3: Repair Agent synthesizes a minimal reviewable unified diff (status='pending')."""
        incident_id = state["incident_id"]
        events = list(state.get("agent_events") or [])

        if not state.get("investigation"):
            return {
                **state,
                "error": "Repair aborted: missing investigation diagnosis.",
                "workflow_status": "failed",
                "current_step": "repair_failed",
            }

        try:
            diag_model = InvestigatorOutput.model_validate(state["investigation"])
            allowed = state.get("allowed_paths") or diag_model.suspected_files or ["src/main/App.java"]
            snippets = state.get("source_snippets") or {allowed[0]: "// source content placeholder"}

            rep_input = RepairInput(
                diagnosis=diag_model,
                relevant_source_snippets=snippets,
                allowed_paths=allowed,
                expected_behavior="Prevent null dereference and maintain invariants",
            )

            patch_output, event = self.repair.propose_repair(rep_input, incident_id=incident_id)
            events.append(event.model_dump())

            patch_id = f"PAT-{incident_id.replace('INC-', '')}"

            # Persist patch to repository as pending
            if patch_repo:
                try:
                    patch_repo.create({
                        "id": patch_id,
                        "incident_id": incident_id,
                        "file_path": patch_output.target_file,
                        "diff": patch_output.diff,
                        "explanation": patch_output.explanation,
                        "status": "pending",
                        "risks": patch_output.potential_risks,
                    })
                except Exception:
                    pass

            if agent_log_repo:
                try:
                    agent_log_repo.create({
                        "incident_id": incident_id,
                        "agent_name": "Repair Agent",
                        "status": "completed",
                        "input_summary": f"Synthesizing fix for {patch_output.target_file}",
                        "output_summary": patch_output.explanation[:200],
                    })
                except Exception:
                    pass

            return {
                **state,
                "patch_proposal": patch_output.model_dump(),
                "patch_id": patch_id,
                "workflow_status": "patch_pending_approval",
                "current_step": "human_gate",
                "agent_events": events,
            }
        except Exception as exc:
            return {
                **state,
                "error": f"Repair error: {str(exc)}",
                "workflow_status": "failed",
                "current_step": "repair_failed",
            }

    def human_approval_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Step 4: Human-in-the-Loop approval gate.
        Validates human decision; records audit log.
        """
        incident_id = state["incident_id"]
        decision_data = state.get("human_decision")
        events = list(state.get("agent_events") or [])

        if not decision_data:
            # Still waiting at gate
            return {
                **state,
                "workflow_status": "patch_pending_approval",
                "current_step": "human_gate",
            }

        decision = decision_data.get("decision", "").lower().strip()
        actor = (decision_data.get("actor") or decision_data.get("approved_by") or "").strip() or "Human Operator"
        notes = decision_data.get("notes", "")

        is_approved = decision in ["approve", "approved"]
        action = "PATCH_APPROVED" if is_approved else "PATCH_REJECTED"
        new_status = "approved" if is_approved else "rejected"
        decision_data["decision"] = new_status
        decision_data["actor"] = actor
        now_iso = current_utc_iso()
        if not decision_data.get("timestamp"):
            decision_data["timestamp"] = now_iso

        gate_event = AgentActivityEvent(
            event_id=f"EVT-HITL-{uuid.uuid4().hex[:8].upper()}",
            incident_id=incident_id,
            agent_name="Human Gate",
            action=action,
            details=f"Human operator {actor} recorded decision: {decision}. {notes}".strip(),
            metadata=decision_data,
        )
        events.append(gate_event.model_dump())

        # Update patch status and human approval details in repository
        patch_id = state.get("patch_id")
        if patch_repo and patch_id:
            try:
                patch_repo.update(patch_id, {
                    "status": new_status,
                    "decision": new_status,
                    "actor": actor,
                    "approved_by": actor,
                    "decided_at": now_iso,
                    "decision_notes": notes,
                })
            except Exception:
                pass

        # Record in audit repo
        if audit_repo:
            try:
                audit_repo.create({
                    "incident_id": incident_id,
                    "incident": incident_id,
                    "agent": "Human Gate",
                    "actor": actor,
                    "action": action,
                    "details": notes or f"Decision {decision} signed.",
                })
            except Exception:
                pass

        return {
            **state,
            "workflow_status": new_status,
            "current_step": "approved" if is_approved else "rejected",
            "agent_events": events,
        }

    def sandbox_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Step 5: Apply approved patch within isolated execution sandbox.
        Strictly skipped if patch was rejected or unapproved.
        """
        incident_id = state["incident_id"]

        decision = (state.get("human_decision") or {}).get("decision")
        if state.get("workflow_status") != "approved" or decision not in ["approved", "approve"]:
            return {
                **state,
                "error": "Sandbox execution aborted: patch is not approved.",
                "workflow_status": "failed",
                "current_step": "sandbox_blocked",
            }

        patch_prop = state.get("patch_proposal") or {}
        patch_file = patch_prop.get("target_file") or patch_prop.get("file_path")
        diff_content = patch_prop.get("diff") or patch_prop.get("patch_content")
        patch_id = state.get("patch_id") or patch_prop.get("id")

        if not patch_file or not diff_content or not patch_id:
            return {
                **state,
                "error": "Sandbox execution aborted: Missing target file, patch ID, or diff content.",
                "workflow_status": "failed",
                "current_step": "sandbox_blocked",
            }

        # Security check: Must have genuine approved human decision
        approval = state.get("human_decision")
        if not approval or str(approval.get("decision", "")).lower() not in ["approve", "approved"]:
            return {
                **state,
                "error": "Sandbox execution blocked: Missing or unapproved human gate record.",
                "workflow_status": "failed",
                "current_step": "sandbox_blocked",
            }

        if state.get("simulate_verification_failure"):
            diff_content = "// Deliberate verification failure\nthrow new RuntimeException('Forced failure');"

        from sandbox import sandbox_service
        patch_data = {
            "id": patch_id,
            "file_path": patch_file,
            "diff": diff_content,
        }

        # Run genuine Docker sandbox execution
        sandbox_res = sandbox_service.execute_patch_verification(
            incident_id=incident_id,
            patch_data=patch_data,
            human_approval=approval,
            timeout_seconds=15,
            persist_results=True,
        )

        res_dict = sandbox_res.model_dump()
        res_dict["applied"] = True
        res_dict["run_id"] = sandbox_res.run_id
        res_dict["container_id"] = sandbox_res.container_id
        res_dict["target_file"] = patch_file
        res_dict["status"] = "ready_for_verification" if sandbox_res.status == "passed" else sandbox_res.status

        # If sandbox execution failed or timed out, report failure state without crashing graph
        if sandbox_res.status not in ["passed"]:
            return {
                **state,
                "sandbox_result": res_dict,
                "workflow_status": "verifying",
                "current_step": "sandbox_failed",
            }

        return {
            **state,
            "sandbox_result": res_dict,
            "workflow_status": "verifying",
            "current_step": "sandbox_applied",
        }

    def verifier_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Step 6: Verifier Agent executes independent verification based on actual Docker results."""
        incident_id = state["incident_id"]
        patch_id = state.get("patch_id", f"PAT-{incident_id.replace('INC-', '')}")
        events = list(state.get("agent_events") or [])

        # Security check: MUST have approved decision
        approval = state.get("human_decision") or {}
        if str(approval.get("decision", "")).lower() not in ["approve", "approved"]:
            return {
                **state,
                "error": "Verifier aborted: Human approval check failed.",
                "workflow_status": "failed",
                "current_step": "verification_blocked",
            }

        try:
            # Consume actual structured Docker sandbox execution results
            sandbox_res = state.get("sandbox_result") or {}
            passed = sandbox_res.get("passed_count", 0)
            failed = sandbox_res.get("failed_count", 0)
            skipped = sandbox_res.get("skipped_count", 0)
            exit_code = sandbox_res.get("exit_code")
            duration_ms = sandbox_res.get("duration_ms", 0)
            docker_isolated = bool(sandbox_res.get("docker_isolated", False))
            timed_out = bool(sandbox_res.get("timed_out", False))
            status = sandbox_res.get("status")
            sim_failure = bool(state.get("simulate_verification_failure"))

            # Verification integrity check:
            # Requires genuine Docker execution, passed > 0, failed == 0, exit_code == 0, not timed out
            is_success = (
                status in ["passed", "ready_for_verification"]
                and docker_isolated is True
                and exit_code == 0
                and passed > 0
                and failed == 0
                and not timed_out
                and not sim_failure
                and not sandbox_res.get("error")
            )

            test_run_status = "passed" if is_success else "failed"
            final_verdict = "verified_recovery" if is_success else "failed"

            output = VerifierOutput(
                test_run_status=test_run_status,
                passed=passed,
                failed=failed if is_success else (failed if failed > 0 else 1),
                skipped=skipped,
                exit_code=exit_code if exit_code is not None else (0 if is_success else 1),
                duration_ms=sandbox_res.get("duration_ms", 0),
                test_output=sandbox_res.get("stdout_summary") or sandbox_res.get("stderr_summary") or f"Docker sandbox test execution: {passed} passed, {failed} failed.",
                original_failure_resolved=is_success,
                regression_tests_passed=is_success,
                final_verification_result=final_verdict,
            )

            action = "VERIFICATION_SUCCESS" if is_success else "VERIFICATION_FAILED"
            details = (
                f"Docker verification {final_verdict}: {passed} passed, {output.failed} failed "
                f"in {duration_ms}ms (Exit code {output.exit_code})."
            )

            event = AgentActivityEvent(
                event_id=f"EVT-VER-{uuid.uuid4().hex[:8].upper()}",
                incident_id=incident_id,
                agent_name="Verifier Agent",
                action=action,
                details=details,
                status="completed" if is_success else "failed",
                metadata={
                    "patch_id": patch_id,
                    "test_run_status": test_run_status,
                    "exit_code": output.exit_code,
                    "passed": passed,
                    "failed": output.failed,
                    "isolated_env": sandbox_res.get("isolated_env", "mesh-docker-isolated"),
                },
            )
            events.append(event.model_dump())

            # Persist verification result
            if verification_repo:
                try:
                    verification_repo.create({
                        "id": f"VR-{uuid.uuid4().hex[:6].upper()}",
                        "incident_id": incident_id,
                        "patch_id": patch_id,
                        "status": output.test_run_status,
                        "passed": output.passed,
                        "failed": output.failed,
                        "skipped": output.skipped,
                        "exit_code": output.exit_code,
                        "duration_ms": output.duration_ms,
                        "output": output.test_output,
                    })
                except Exception:
                    pass

            if agent_log_repo:
                try:
                    agent_log_repo.create({
                        "incident_id": incident_id,
                        "agent_name": "Verifier Agent",
                        "status": output.test_run_status,
                        "input_summary": f"Executed verification on {patch_id}",
                        "output_summary": f"{output.passed} passed, {output.failed} failed",
                    })
                except Exception:
                    pass

            return {
                **state,
                "verification_result": output.model_dump(),
                "workflow_status": "verifying",
                "current_step": "verifier",
                "agent_events": events,
            }
        except Exception as exc:
            return {
                **state,
                "error": f"Verifier error: {str(exc)}",
                "workflow_status": "failed",
                "current_step": "verifier_failed",
            }

    def finalize_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Step 7: Finalize incident status based on verification outcome.
        Recovery declared ONLY when tests pass 100%.
        """
        incident_id = state["incident_id"]
        ver_res = state.get("verification_result") or {}

        if ver_res.get("final_verification_result") == "verified_recovery":
            final_status = "recovered"
        else:
            final_status = "failed"

        # Update incident in repository
        if incident_repo:
            try:
                incident_repo.update_status(incident_id, final_status)
            except Exception:
                pass

        if audit_repo:
            try:
                audit_repo.create({
                    "incident_id": incident_id,
                    "incident": incident_id,
                    "agent": "SentinelMesh Orchestrator",
                    "action": f"WORKFLOW_{final_status.upper()}",
                    "details": f"Incident finalized as {final_status} based on verifier results.",
                })
            except Exception:
                pass

        return {
            **state,
            "workflow_status": final_status,
            "current_step": "completed",
        }

    def rejection_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Terminal node when patch is rejected by human operator."""
        incident_id = state["incident_id"]

        if incident_repo:
            try:
                incident_repo.update_status(incident_id, "rejected")
            except Exception:
                pass

        return {
            **state,
            "workflow_status": "rejected",
            "current_step": "completed_rejected",
        }

    def error_node(self, state: OrchestratorGraphState) -> OrchestratorGraphState:
        """Terminal node for unhandled or validation errors."""
        incident_id = state.get("incident_id", "UNKNOWN")

        if incident_repo and incident_id != "UNKNOWN":
            try:
                incident_repo.update_status(incident_id, "failed")
            except Exception:
                pass

        return {
            **state,
            "workflow_status": "failed",
            "current_step": "completed_error",
        }


# ---------------------------------------------------------------------------
# Conditional Transition Functions
# ---------------------------------------------------------------------------
def check_observer_result(state: OrchestratorGraphState) -> str:
    """Route after observer."""
    if state.get("error") or not state.get("evidence"):
        return "error_node"
    return "investigator_node"


def check_investigator_result(state: OrchestratorGraphState) -> str:
    """Route after investigator."""
    if state.get("error") or not state.get("investigation"):
        return "error_node"
    return "repair_node"


def check_repair_result(state: OrchestratorGraphState) -> str:
    """Route after repair."""
    if state.get("error") or not state.get("patch_proposal"):
        return "error_node"
    return "human_approval_node"


def route_human_decision(state: OrchestratorGraphState) -> str:
    """Route after human approval checkpoint."""
    decision_data = state.get("human_decision")
    if not decision_data:
        return END  # Paused at human gate

    decision = decision_data.get("decision", "").lower().strip()
    if decision in ["approve", "approved"]:
        return "sandbox_node"
    elif decision in ["reject", "rejected"]:
        return "rejection_node"
    return "error_node"


def route_verification_outcome(state: OrchestratorGraphState) -> str:
    """Route after verification."""
    if state.get("error") or not state.get("verification_result"):
        return "error_node"
    return "finalize_node"


# ---------------------------------------------------------------------------
# Graph Builder
# ---------------------------------------------------------------------------
def build_sentinelmesh_graph(
    nodes: Optional[LangGraphOrchestratorNodes] = None,
    checkpointer: Optional[Any] = None,
):
    """Build and compile the SentinelMesh LangGraph StateGraph."""
    n = nodes or LangGraphOrchestratorNodes()
    builder = StateGraph(OrchestratorGraphState)

    # 1. Register Nodes
    builder.add_node("observer_node", n.observer_node)
    builder.add_node("investigator_node", n.investigator_node)
    builder.add_node("repair_node", n.repair_node)
    builder.add_node("human_approval_node", n.human_approval_node)
    builder.add_node("sandbox_node", n.sandbox_node)
    builder.add_node("verifier_node", n.verifier_node)
    builder.add_node("finalize_node", n.finalize_node)
    builder.add_node("rejection_node", n.rejection_node)
    builder.add_node("error_node", n.error_node)

    # 2. Add Edges & Conditional Routes
    builder.add_edge(START, "observer_node")

    builder.add_conditional_edges(
        "observer_node",
        check_observer_result,
        {
            "investigator_node": "investigator_node",
            "error_node": "error_node",
        },
    )

    builder.add_conditional_edges(
        "investigator_node",
        check_investigator_result,
        {
            "repair_node": "repair_node",
            "error_node": "error_node",
        },
    )

    builder.add_conditional_edges(
        "repair_node",
        check_repair_result,
        {
            "human_approval_node": "human_approval_node",
            "error_node": "error_node",
        },
    )

    builder.add_conditional_edges(
        "human_approval_node",
        route_human_decision,
        {
            "sandbox_node": "sandbox_node",
            "rejection_node": "rejection_node",
            "error_node": "error_node",
            END: END,
        },
    )

    builder.add_edge("sandbox_node", "verifier_node")

    builder.add_conditional_edges(
        "verifier_node",
        route_verification_outcome,
        {
            "finalize_node": "finalize_node",
            "error_node": "error_node",
        },
    )

    builder.add_edge("finalize_node", END)
    builder.add_edge("rejection_node", END)
    builder.add_edge("error_node", END)

    cp = checkpointer or MemorySaver()
    return builder.compile(checkpointer=cp)


# ---------------------------------------------------------------------------
# High-Level Orchestrator Service Wrapper
# ---------------------------------------------------------------------------
class LangGraphOrchestratorService:
    """Service providing high-level invoke and resume APIs for the LangGraph workflow."""

    def __init__(self, checkpointer: Optional[Any] = None, db_path: Optional[str] = None):
        if checkpointer is not None:
            self.checkpointer = checkpointer
        elif db_path is not None:
            self.checkpointer = SqliteSaver(db_path)
        elif os.environ.get("SENTINELMESH_CHECKPOINT_DB"):
            self.checkpointer = SqliteSaver(os.environ["SENTINELMESH_CHECKPOINT_DB"])
        else:
            self.checkpointer = MemorySaver()
        self.nodes = LangGraphOrchestratorNodes()
        self.graph = build_sentinelmesh_graph(self.nodes, checkpointer=self.checkpointer)

    def start_workflow(
        self,
        incident_id: str,
        application: str,
        error_summary: str,
        logs: List[str] = None,
        stack_trace: str = None,
        source_snippets: Dict[str, str] = None,
        allowed_paths: List[str] = None,
    ) -> OrchestratorGraphState:
        """Start workflow up to the Human Approval checkpoint."""
        initial_state: OrchestratorGraphState = {
            "incident_id": incident_id,
            "application": application,
            "error_summary": error_summary,
            "logs": logs or [],
            "stack_trace": stack_trace,
            "source_snippets": source_snippets or {},
            "allowed_paths": allowed_paths or [],
            "agent_events": [],
            "workflow_status": "detected",
            "current_step": "init",
        }

        config = {"configurable": {"thread_id": incident_id}}
        final_state = self.graph.invoke(initial_state, config=config)
        return final_state

    def submit_approval_and_resume(
        self,
        incident_id: str,
        decision: str,
        actor: str = "Human Operator",
        notes: str = "",
        simulate_verification_failure: bool = False,
    ) -> OrchestratorGraphState:
        """Resume workflow from Human Approval checkpoint with decision."""
        clean_actor = (actor or "").strip()
        if not clean_actor:
            raise ValueError("Human approval requires a valid actor identity (non-empty).")

        config = {"configurable": {"thread_id": incident_id}}
        current = self.graph.get_state(config)

        state_values = dict(current.values) if current and current.values else {
            "incident_id": incident_id,
            "workflow_status": "patch_pending_approval",
        }

        now_iso = current_utc_iso()
        decision_norm = decision.lower().strip()
        status_norm = "approved" if decision_norm in ["approve", "approved"] else "rejected"

        # Add human decision
        state_values["human_decision"] = {
            "decision": status_norm,
            "actor": clean_actor,
            "notes": notes,
            "timestamp": now_iso,
        }

        # Update patch repository directly to ensure persisted approval record exists
        patch_id = state_values.get("patch_id")
        if patch_repo:
            if patch_id:
                try:
                    patch_repo.update(patch_id, {
                        "status": status_norm,
                        "decision": status_norm,
                        "actor": clean_actor,
                        "approved_by": clean_actor,
                        "decided_at": now_iso,
                        "decision_notes": notes,
                    })
                except Exception:
                    pass
            else:
                patches = patch_repo.list_by_incident(incident_id)
                for p in patches:
                    try:
                        patch_repo.update(p["id"], {
                            "status": status_norm,
                            "decision": status_norm,
                            "actor": clean_actor,
                            "approved_by": clean_actor,
                            "decided_at": now_iso,
                            "decision_notes": notes,
                        })
                    except Exception:
                        pass

        if simulate_verification_failure:
            state_values["simulate_verification_failure"] = True

        # Resume execution
        resumed_state = self.graph.invoke(state_values, config=config)
        return resumed_state


# Singleton instance
langgraph_orchestrator = LangGraphOrchestratorService()
