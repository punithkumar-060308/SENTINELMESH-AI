# Testing and Verification Implementation Guide

## Goal
Prove that SentinelMesh AI's proposed repair actually works by running deterministic tests in a controlled environment. The Verifier must report real execution results.

## Ownership
Primary owner: testing/demo-app member, guided by backend and AI leads.

## Testing layers

### 1. Demo application tests
Create a small FastAPI demo service with a reproducible bug. Example:
- `GET /users` returns HTTP 500 due to a known intentional defect.
- A regression test expects `GET /users` to return HTTP 200 with the expected response.

Keep the failure deterministic and easy to explain.

### 2. Unit tests
Test:
- Evidence normalization.
- Investigator output schema validation.
- Patch format and path validation.
- Approval decision validation.
- Workflow transition rules.
- Verification result interpretation.

### 3. API tests
Test:
- Health endpoint.
- Create/list/detail incident.
- Invalid request payloads.
- Missing incident.
- Patch approval and rejection.
- Verification request.
- Error handling.

### 4. Agent tests
Use fixed fixtures where possible:
- Observer receives known logs and returns normalized evidence.
- Investigator references supplied evidence.
- Repair returns a valid patch proposal for the demo defect.
- Verifier consumes actual test-run results and reports pass/fail accurately.

LLM tests can be variable. Keep deterministic schema and safety tests separate from model-quality tests.

### 5. Integration tests
Test the complete path:
1. Create demo incident.
2. Collect evidence.
3. Investigate.
4. Generate patch.
5. Confirm patch is pending.
6. Reject patch and confirm sandbox is not called.
7. Approve a separate patch.
8. Apply it in the disposable sandbox.
9. Run regression tests.
10. Record the actual outcome.

## Verification rules
- Use a fixed test command configured by the application.
- Capture exit code, stdout/stderr summary, duration, and test counts.
- A timeout is not a pass.
- A runner error is not a pass.
- Missing test results are not a pass.
- The LLM cannot declare its own patch verified.
- Define exactly which tests must pass for recovery.
- If the original failure is not resolved, verification fails.
- If required regression tests fail, verification fails.

## Example acceptance tests
- Known broken endpoint fails before patch.
- Proposed patch does not modify files before approval.
- Rejected patch is never applied.
- Approved patch is applied only inside the sandbox.
- Correct patch makes the original failing test pass.
- Incorrect patch fails verification.
- A timeout produces a non-success result.
- Failed verification does not mark incident recovered.
- Successful independent verification records recovered status.

## Useful commands
Run tests from the relevant environment:
```powershell
pytest -q
```

For a demo FastAPI app, use HTTPX/TestClient according to the app setup. Keep test fixtures small and repeatable.

## Test report fields
- Incident ID
- Patch ID
- Sandbox run ID
- Test suite
- Passed count
- Failed count
- Skipped count
- Exit code
- Duration
- Completion timestamp
- Final status
- Short failure details

## Definition of done
- [ ] Baseline defect is reproducible.
- [ ] Regression test fails before the fix.
- [ ] Patch remains unapplied before approval.
- [ ] Rejection path prevents execution.
- [ ] Approved patch is tested in the sandbox.
- [ ] Correct patch passes required tests.
- [ ] Incorrect patch fails.
- [ ] Timeout/error is not treated as success.
- [ ] Incident state reflects actual verification result.
