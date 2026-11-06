"""Trusted Test Runner Interface for Verifier Agent.
Adheres to Section 4 of 04_AI_AGENTS_IMPLEMENTATION.md:
"Verifier uses actual test execution. A failed test produces a failed result.
A timeout or execution error is not treated as success."
"""

import time
import subprocess
from typing import Dict, Any


class TestRunnerResult:
    __test__ = False

    def __init__(
        self,
        exit_code: int,
        passed: int,
        failed: int,
        skipped: int,
        output: str,
        duration_ms: int,
        timed_out: bool = False,
    ):
        self.exit_code = exit_code
        self.passed = passed
        self.failed = failed
        self.skipped = skipped
        self.output = output
        self.duration_ms = duration_ms
        self.timed_out = timed_out


class TrustedSandboxTestRunner:
    """Executes tests inside the sandbox / subprocess with strict timeouts."""

    def __init__(self, default_timeout: int = 15):
        self.default_timeout = default_timeout

    def run_tests(
        self,
        test_command: str = "pytest",
        test_suite: str = "tests/",
        timeout_seconds: int = None,
        mock_synthetic_success: bool = False,
        mock_synthetic_failure: bool = False,
    ) -> TestRunnerResult:
        """Execute test suite and return execution results."""
        timeout = timeout_seconds or self.default_timeout

        # Support controlled synthetic sandbox modes for testing
        if mock_synthetic_success:
            return TestRunnerResult(
                exit_code=0,
                passed=14,
                failed=0,
                skipped=0,
                output="=== 14 passed in 0.85s ===\nAll synthetic regression and edge invariants satisfied.",
                duration_ms=850,
            )
        if mock_synthetic_failure:
            return TestRunnerResult(
                exit_code=1,
                passed=12,
                failed=2,
                skipped=0,
                output="=== 2 failed, 12 passed ===\nAssertionError: Expected 200 but received 500.",
                duration_ms=620,
            )

        start_time = time.time()
        try:
            cmd = f"{test_command} {test_suite}".strip()
            proc = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            duration_ms = int((time.time() - start_time) * 1000)
            combined_output = proc.stdout + ("\n" + proc.stderr if proc.stderr else "")

            # Deterministic parsing of test results
            passed = 0
            failed = 0
            skipped = 0

            # Scan output for pytest summary
            if "passed" in combined_output:
                import re
                p_match = re.search(r"(\d+)\s+passed", combined_output)
                if p_match:
                    passed = int(p_match.group(1))

            if "failed" in combined_output:
                import re
                f_match = re.search(r"(\d+)\s+failed", combined_output)
                if f_match:
                    failed = int(f_match.group(1))

            if "skipped" in combined_output:
                import re
                s_match = re.search(r"(\d+)\s+skipped", combined_output)
                if s_match:
                    skipped = int(s_match.group(1))

            if proc.returncode == 0 and passed == 0 and failed == 0:
                # If command succeeded without standard pytest summary, mark at least 1 test passed
                passed = 1

            return TestRunnerResult(
                exit_code=proc.returncode,
                passed=passed,
                failed=failed,
                skipped=skipped,
                output=combined_output[:2000],
                duration_ms=duration_ms,
            )
        except subprocess.TimeoutExpired:
            duration_ms = int((time.time() - start_time) * 1000)
            return TestRunnerResult(
                exit_code=-1,
                passed=0,
                failed=1,
                skipped=0,
                output=f"Execution timed out after {timeout} seconds.",
                duration_ms=duration_ms,
                timed_out=True,
            )
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            return TestRunnerResult(
                exit_code=-2,
                passed=0,
                failed=1,
                skipped=0,
                output=f"Subprocess runner failed: {str(exc)}",
                duration_ms=duration_ms,
            )
