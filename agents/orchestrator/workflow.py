"""Multi-Agent Orchestrator for SentinelMesh AI.
Coordinates Observer, Investigator, Repair, Human-in-the-Loop Gate, and Verifier agents.
Adheres strictly to the principles in 04_AI_AGENTS_IMPLEMENTATION.md:
- Each agent has one clearly defined responsibility.
- Repair cannot execute or apply code.
- Human approval is required before verification.
- Verifier uses actual test execution.
- Deterministic workflow logic enforces transitions and recovery state.
"""

import uuid
from typing import Dict, Any, List, Optional
from agents.common.schemas import (
    WorkflowState,
    ObserverInput,
    InvestigatorInput,
    RepairInput,
    VerifierInput,
    AgentActivityEvent,
    current_utc_iso,
)
from agents.observer.observer_agent import ObserverAgent
from agents.investigator.investigator_agent import InvestigatorAgent
from agents.repair.repair_agent import RepairAgent
from agents.verifier.verifier_agent import VerifierAgent
from agents.orchestrator.state import transition_workflow


class SentinelMeshOrchestrator:
    """Central workflow engine coordinating all 4 AI agents and human governance."""

    def __init__(
        self,
        observer: ObserverAgent = None,
        investigator: InvestigatorAgent = None,
        repair: RepairAgent = None,
        verifier: VerifierAgent = None,
    ):
        self.observer = observer or ObserverAgent()
        self.investigator = investigator or InvestigatorAgent()
        self.repair = repair or RepairAgent()
        self.verifier = verifier or VerifierAgent()

    def start_incident(self, trigger_input: ObserverInput) -> WorkflowState:
        """Step 1: Ingest incident and execute Observer Agent."""
        incident_id = trigger_input.incident_id or f"INC-{uuid.uuid4().hex[:4].upper()}"

        state = WorkflowState(
            incident_id=incident_id,
            application=trigger_input.application,
            error_summary=trigger_input.error_message,
            logs=trigger_input.logs,
            stack_trace=trigger_input.stack_trace,
            workflow_status="detected",
            current_step="observer",
        )

        evidence, obs_event = self.observer.observe(trigger_input)
        state.evidence = evidence
        state.agent_events.append(obs_event)
        transition_workflow(state, "investigating", step="investigator")
        return state

    def run_investigation(
        self,
        state: WorkflowState,
        source_snippets: Dict[str, str],
        app_context: Dict[str, Any] = None,
        test_failures: Dict[str, Any] = None,
    ) -> WorkflowState:
        """Step 2: Execute Investigator Agent with bounded source snippets."""
        if not state.evidence:
            raise ValueError("Cannot investigate without observed incident evidence.")

        inv_input = InvestigatorInput(
            evidence=state.evidence,
            relevant_source_snippets=source_snippets,
            application_context=app_context or {},
            test_failure_details=test_failures,
        )

        diagnosis, inv_event = self.investigator.investigate(inv_input, incident_id=state.incident_id)
        state.diagnosis = diagnosis
        state.relevant_files = diagnosis.suspected_files
        state.agent_events.append(inv_event)
        transition_workflow(state, "investigating", step="repair")
        return state

    def propose_repair(
        self,
        state: WorkflowState,
        allowed_paths: List[str],
        source_snippets: Dict[str, str],
        existing_tests: List[str] = None,
        expected_behavior: str = "",
    ) -> WorkflowState:
        """Step 3: Execute Repair Agent to propose a minimal reviewable patch.
        Halts at the Human Gate (status: patch_pending_approval).
        """
        if not state.diagnosis:
            raise ValueError("Cannot propose repair without diagnostic root cause.")

        rep_input = RepairInput(
            diagnosis=state.diagnosis,
            relevant_source_snippets=source_snippets,
            allowed_paths=allowed_paths,
            existing_tests=existing_tests or [],
            expected_behavior=expected_behavior,
        )

        patch, rep_event = self.repair.propose_repair(rep_input, incident_id=state.incident_id)
        state.patch = patch
        state.agent_events.append(rep_event)

        # Halt workflow at Human Gate
        transition_workflow(state, "patch_pending_approval", step="human_gate")
        return state

    def submit_human_decision(
        self,
        state: WorkflowState,
        decision: str,  # 'approve' or 'reject'
        actor: str = "Elena Vance (Staff SRE)",
        notes: str = "",
    ) -> WorkflowState:
        """Step 4: Human-in-the-Loop decision gate.
        Enforces human approval before sandbox execution.
        """
        if state.workflow_status != "patch_pending_approval":
            raise ValueError(
                f"Cannot record human decision on state with status '{state.workflow_status}'. "
                "Must be 'patch_pending_approval'."
            )

        norm_decision = decision.lower().strip()
        state.human_decision = {
            "decision": "approved" if norm_decision == "approve" else "rejected",
            "actor": actor,
            "timestamp": current_utc_iso(),
            "notes": notes,
        }

        # Record human audit event
        gate_event = AgentActivityEvent(
            event_id=f"EVT-HITL-{uuid.uuid4().hex[:8].upper()}",
            incident_id=state.incident_id,
            agent_name="Human Gate",
            action=f"PATCH_{state.human_decision['decision'].upper()}",
            details=f"Human operator {actor} recorded decision: {state.human_decision['decision']}. {notes}".strip(),
            metadata=state.human_decision,
        )
        state.agent_events.append(gate_event)

        if state.human_decision["decision"] == "approved":
            transition_workflow(state, "approved", step="ready_for_verification")
        else:
            transition_workflow(state, "rejected", step="awaiting_alternative_patch")

        return state

    def verify_and_finalize(
        self,
        state: WorkflowState,
        test_command: str = "pytest",
        test_suite: str = "tests/",
        timeout_seconds: int = 30,
        mock_synthetic_success: bool = False,
        mock_synthetic_failure: bool = False,
    ) -> WorkflowState:
        """Step 5: Execute Verifier Agent in sandbox and finalize incident status.
        Recovery is declared ONLY when verifier tests pass 100%.
        """
        if state.workflow_status != "approved":
            raise PermissionError(
                f"Cannot execute verification: Incident '{state.incident_id}' status is '{state.workflow_status}'. "
                "Must be 'approved' by a human operator."
            )

        transition_workflow(state, "verifying", step="verifier")

        patch_id = f"PAT-{state.incident_id.replace('INC-', '')}"
        ver_input = VerifierInput(
            incident_id=state.incident_id,
            patch_id=patch_id,
            human_approval=state.human_decision or {},
            test_command=test_command,
            test_suite=test_suite,
            timeout_seconds=timeout_seconds,
            target_path=state.patch.target_file if state.patch else None,
            patch_diff=state.patch.diff if state.patch else None,
        )

        verification_res, ver_event = self.verifier.verify(
            ver_input,
            mock_synthetic_success=mock_synthetic_success,
            mock_synthetic_failure=mock_synthetic_failure,
        )

        state.verification = verification_res
        state.agent_events.append(ver_event)

        # Enforce deterministic lifecycle rule:
        # Recovery happens ONLY after successful sandbox verification.
        if verification_res.final_verification_result == "verified_recovery":
            transition_workflow(state, "recovered", step="completed")
        else:
            transition_workflow(state, "failed", step="completed")

        return state

    def run_autonomous_pipeline_until_gate(
        self,
        trigger_input: ObserverInput,
        source_snippets: Dict[str, str],
        allowed_paths: List[str],
        app_context: Dict[str, Any] = None,
    ) -> WorkflowState:
        """Run the end-to-end multi-agent pipeline up to the Human Gate.
        Automatically pauses and presents the proposed patch for human sign-off.
        """
        state = self.start_incident(trigger_input)
        state = self.run_investigation(state, source_snippets, app_context)
        state = self.propose_repair(state, allowed_paths, source_snippets)
        return state
