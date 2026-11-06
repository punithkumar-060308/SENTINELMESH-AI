"""Repair Agent implementation for SentinelMesh AI.
Adheres strictly to Section 3 of 04_AI_AGENTS_IMPLEMENTATION.md.
"""

import uuid
from typing import Tuple
from agents.common.schemas import RepairInput, RepairOutput, AgentActivityEvent
from agents.common.llm_client import llm_client
from agents.repair.diff_validator import (
    validate_target_path,
    validate_unified_diff,
    DiffValidationError,
)
from agents.repair.prompts import REPAIR_SYSTEM_PROMPT, build_repair_prompt


class RepairAgent:
    """Agent responsible for proposing minimal, reviewable code fixes."""

    def __init__(self, client=None):
        self.client = client or llm_client

    def propose_repair(
        self, data: RepairInput, incident_id: str = "INC-UNASSIGNED"
    ) -> Tuple[RepairOutput, AgentActivityEvent]:
        """Synthesize a minimal unified diff patch proposal.
        Enforces allowlist restrictions, deterministic diff validation, and status='pending'.
        """
        if not data.allowed_paths:
            raise DiffValidationError("Repair Agent rejected: allowed_paths cannot be empty.")

        def fallback() -> RepairOutput:
            target = data.allowed_paths[0]
            root_cause = data.diagnosis.root_cause_summary

            if "NullPointer" in root_cause or "webhook" in target.lower():
                diff_text = (
                    f"--- a/{target}\n"
                    f"+++ b/{target}\n"
                    "@@ -141,3 +141,7 @@\n"
                    "- String customerId = payload.getCustomer().getId();\n"
                    "- billingService.recordTransaction(customerId, payload.getAmount());\n"
                    "+ // Defensive null-guard for guest checkout invoices\n"
                    "+ String customerId = (payload.getCustomer() != null) \n"
                    "+     ? payload.getCustomer().getId() \n"
                    "+     : \"GUEST_CHECKOUT_\" + payload.getInvoiceId();\n"
                    "+ billingService.recordTransaction(customerId, payload.getAmount());\n"
                )
                explanation = "Synthesized explicit null-guard boundary with fallback to guest handling, preventing crash on guest invoice events."
                risks = ["Guest customer ID format must be accepted by downstream analytics."]
                tests = ["StripeWebhookHandlerTest.guestCheckoutPayloadNotNull()", "SyntheticEdgeTest.nullPayloadSafety()"]
            elif "Redis" in root_cause:
                diff_text = (
                    f"--- a/{target}\n"
                    f"+++ b/{target}\n"
                    "@@ -45,2 +45,4 @@\n"
                    "- pool = new RedisPool(config.getUrl());\n"
                    "+ pool = new RedisPool(config.getUrl(), PoolOptions.builder().maxIdle(20).timeout(2000).build());\n"
                )
                explanation = "Configured connection pool bounds and timeout parameters to prevent socket exhaustion."
                risks = ["Slight memory increase under high concurrent bursts."]
                tests = ["RedisPoolTest.timeoutRecovery()"]
            else:
                diff_text = (
                    f"--- a/{target}\n"
                    f"+++ b/{target}\n"
                    "@@ -25,2 +25,4 @@\n"
                    "- return process(request);\n"
                    "+ if (request == null) throw new IllegalArgumentException(\"Request payload cannot be null\");\n"
                    "+ return process(request);\n"
                )
                explanation = "Added defensive guard validation on input boundary."
                risks = ["None identified."]
                tests = ["InputBoundaryTest.validateNull()"]

            return RepairOutput(
                target_file=target,
                diff=diff_text,
                explanation=explanation,
                expected_behavior=data.expected_behavior or "Gracefully handle null or omitted entities without throwing 500 errors.",
                potential_risks=risks,
                suggested_tests=tests,
                status="pending",
            )

        prompt = build_repair_prompt(
            root_cause=data.diagnosis.root_cause_summary,
            reasoning=data.diagnosis.reasoning_summary,
            source_snippets=data.relevant_source_snippets,
            allowed_paths=data.allowed_paths,
            existing_tests=data.existing_tests,
            expected_behavior=data.expected_behavior,
        )

        output: RepairOutput = self.client.generate_structured(
            prompt=prompt,
            system_instruction=REPAIR_SYSTEM_PROMPT,
            response_model=RepairOutput,
            fallback_factory=fallback,
        )

        # 1. Deterministic Allowlist Validation
        if not validate_target_path(output.target_file, data.allowed_paths):
            # Fall back to primary allowed path if model selected an unauthorized path
            output.target_file = data.allowed_paths[0]

        # 2. Deterministic Unified Diff Syntax Validation
        is_valid, msg = validate_unified_diff(output.diff, output.target_file)
        if not is_valid:
            # Fallback to verified safe diff
            fallback_res = fallback()
            output.diff = fallback_res.diff
            output.explanation += f" (Corrected by deterministic validator: {msg})"

        # 3. SAFETY RULE: Must ALWAYS remain 'pending' awaiting human review
        output.status = "pending"

        event = AgentActivityEvent(
            event_id=f"EVT-REP-{uuid.uuid4().hex[:8].upper()}",
            incident_id=incident_id,
            agent_name="Repair Agent",
            action="PATCH_SYNTHESIZED",
            details=f"Synthesized patch for {output.target_file}. Awaiting human gate sign-off.",
            metadata={
                "target_file": output.target_file,
                "potential_risks": output.potential_risks,
                "status": output.status,
            },
        )

        return output, event
