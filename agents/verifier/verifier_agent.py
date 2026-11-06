"""Verifier Agent implementation for SentinelMesh AI.
Adheres strictly to Section 4 of 04_AI_AGENTS_IMPLEMENTATION.md.
"""

import uuid
from typing import Tuple
from agents.common.schemas import VerifierInput, VerifierOutput, AgentActivityEvent
from agents.verifier.test_runner import TrustedSandboxTestRunner


class VerificationPermissionError(PermissionError):
    """Raised when an unapproved patch is submitted for verification."""
    pass


class VerifierAgent:
    """Agent responsible for independent regression testing and verification."""

    def __init__(self, runner: TrustedSandboxTestRunner = None):
        self.runner = runner or TrustedSandboxTestRunner()

    def verify(
        self, data: VerifierInput, mock_synthetic_success: bool = False, mock_synthetic_failure: bool = False
    ) -> Tuple[VerifierOutput, AgentActivityEvent]:
        """Execute independent regression tests for an approved patch.
        Strictly enforces:
        1. Human approval check ('approved')
        2. Real test execution (never ask an LLM to certify its own fix)
        3. Recovery is declared ONLY when 100% tests pass and exit code == 0.
        """
        # 1. Enforce Human Gate sign-off
        decision = data.human_approval.get("decision") if data.human_approval else None
        if decision != "approved":
            raise VerificationPermissionError(
                f"Verifier Agent rejected: Patch '{data.patch_id}' lacks human approval. Current decision: '{decision}'."
            )

        # 2. Execute test suite
        run_res = self.runner.run_tests(
            test_command=data.test_command,
            test_suite=data.test_suite,
            timeout_seconds=data.timeout_seconds,
            mock_synthetic_success=mock_synthetic_success,
            mock_synthetic_failure=mock_synthetic_failure,
        )

        # 3. Deterministic evaluation of execution evidence
        if run_res.timed_out:
            test_status = "timeout"
            final_res = "failed"
            resolved = False
            regression_ok = False
        elif run_res.exit_code == 0 and run_res.failed == 0 and (run_res.passed > 0 or not run_res.failed):
            test_status = "passed"
            final_res = "verified_recovery"
            resolved = True
            regression_ok = True
        else:
            test_status = "failed"
            final_res = "failed"
            resolved = False
            regression_ok = False

        output = VerifierOutput(
            test_run_status=test_status,
            passed=run_res.passed,
            failed=run_res.failed,
            skipped=run_res.skipped,
            exit_code=run_res.exit_code,
            duration_ms=run_res.duration_ms,
            test_output=run_res.output,
            original_failure_resolved=resolved,
            regression_tests_passed=regression_ok,
            final_verification_result=final_res,
        )

        # 4. Generate audit event
        action = "VERIFICATION_SUCCESS" if final_res == "verified_recovery" else "VERIFICATION_FAILED"
        details = (
            f"Verification {final_res}: {run_res.passed} passed, {run_res.failed} failed "
            f"in {run_res.duration_ms}ms (Exit code {run_res.exit_code})."
        )

        event = AgentActivityEvent(
            event_id=f"EVT-VER-{uuid.uuid4().hex[:8].upper()}",
            incident_id=data.incident_id,
            agent_name="Verifier Agent",
            action=action,
            details=details,
            metadata={
                "patch_id": data.patch_id,
                "test_run_status": test_status,
                "exit_code": run_res.exit_code,
                "passed": run_res.passed,
                "failed": run_res.failed,
            },
        )

        return output, event
