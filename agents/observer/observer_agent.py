"""Observer Agent implementation for SentinelMesh AI.
Adheres strictly to Section 1 of 04_AI_AGENTS_IMPLEMENTATION.md.
"""

import uuid
from typing import Tuple, List
from agents.common.schemas import ObserverInput, ObserverOutput, AgentActivityEvent, current_utc_iso
from agents.common.llm_client import llm_client
from agents.observer.prompts import OBSERVER_SYSTEM_PROMPT, build_observer_prompt


class ObserverAgent:
    """Agent responsible for incident evidence collection and normalization."""

    def __init__(self, client=None):
        self.client = client or llm_client

    def observe(self, data: ObserverInput) -> Tuple[ObserverOutput, AgentActivityEvent]:
        """Process an incoming incident trigger and normalize evidence into structured output.
        Emits structured evidence and an audit activity event.
        """
        # Determine missing evidence deterministically
        missing: List[str] = []
        if not data.logs:
            missing.append("application_logs_missing")
        if not data.stack_trace:
            missing.append("stack_trace_missing")
        if not data.health_check_result:
            missing.append("health_check_metrics_missing")

        evidence_sources: List[str] = []
        if data.incident_trigger:
            evidence_sources.append("incident_trigger")
        if data.logs:
            evidence_sources.append("application_logs")
        if data.stack_trace:
            evidence_sources.append("stack_trace")
        if data.health_check_result:
            evidence_sources.append("health_check")

        def fallback() -> ObserverOutput:
            # Deterministic, non-hallucinatory normalization
            error_type = "GenericApplicationError"
            if "NullPointer" in data.error_message:
                error_type = "NullPointerException"
            elif "ConnectionRefused" in data.error_message or "Redis" in data.error_message:
                error_type = "ConnectionRefusedError"
            elif "Timeout" in data.error_message:
                error_type = "TimeoutError"
            elif "500" in data.error_message:
                error_type = "InternalServerError"

            # Filter relevant logs that match error or warning
            relevant_logs = [
                line for line in data.logs
                if any(w in line.lower() for w in ["error", "warn", "exception", "failed", "crash", "500"])
            ]
            if not relevant_logs and data.logs:
                relevant_logs = data.logs[:5]

            summary = f"Detected {error_type} in {data.application}: {data.error_message}"

            return ObserverOutput(
                incident_summary=summary,
                error_type=error_type,
                relevant_log_excerpts=relevant_logs,
                stack_trace_reference=data.stack_trace[:300] if data.stack_trace else None,
                evidence_sources=evidence_sources,
                collection_timestamp=current_utc_iso(),
                missing_evidence_list=missing,
            )

        prompt = build_observer_prompt(
            trigger=data.incident_trigger,
            application=data.application,
            error_message=data.error_message,
            logs=data.logs,
            stack_trace=data.stack_trace,
            health_check=data.health_check_result,
        )

        output: ObserverOutput = self.client.generate_structured(
            prompt=prompt,
            system_instruction=OBSERVER_SYSTEM_PROMPT,
            response_model=ObserverOutput,
            fallback_factory=fallback,
        )

        # Enforce deterministic integrity: do not permit missing evidence fabrication
        for m in missing:
            if m not in output.missing_evidence_list:
                output.missing_evidence_list.append(m)

        for src in evidence_sources:
            if src not in output.evidence_sources:
                output.evidence_sources.append(src)

        # Create audit event
        event = AgentActivityEvent(
            event_id=f"EVT-OBS-{uuid.uuid4().hex[:8].upper()}",
            incident_id=data.incident_id or "INC-UNASSIGNED",
            agent_name="Observer Agent",
            action="INCIDENT_OBSERVED",
            details=f"Normalized evidence for {output.error_type} in {data.application}. Identified {len(output.relevant_log_excerpts)} log excerpts.",
            metadata={
                "error_type": output.error_type,
                "evidence_sources": output.evidence_sources,
                "missing_evidence": output.missing_evidence_list,
            }
        )

        return output, event
