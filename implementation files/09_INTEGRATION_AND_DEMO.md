# Integration and Demo Implementation Guide

## Goal
Connect the frontend, backend, database, agents, orchestrator, sandbox, and verifier into one reliable end-to-end demonstration.

## Ownership
All members. Backend and AI leads coordinate integration; every module owner fixes issues in their own module.

## Integration order
Do not connect everything at once. Integrate in small vertical slices.

### Slice 1 — Frontend to backend
- Backend health endpoint works.
- Frontend can call health endpoint.
- CORS is configured.
- Frontend displays backend connected/disconnected state accurately.

### Slice 2 — Incident creation and persistence
- Demo app produces known error.
- Backend receives incident.
- Incident is saved to database.
- Frontend displays the incident.

### Slice 3 — Observer and Investigator
- Observer collects error evidence.
- Evidence is stored and visible.
- Investigator produces diagnosis based on that evidence.
- Agent activity appears in incident details.

### Slice 4 — Repair and human approval
- Repair generates a constrained patch proposal.
- Patch is stored as pending.
- Frontend displays the diff.
- Human can approve or reject.
- Rejection prevents patch execution.

### Slice 5 — Sandbox and Verifier
- Approved patch reaches the sandbox service.
- Sandbox returns actual application result.
- Verifier runs the configured tests.
- Test output and status are persisted.
- Incident is marked recovered only after successful verification.

### Slice 6 — Audit and final report
- Important state transitions create audit events.
- Frontend displays chronological audit history.
- Final incident report shows diagnosis, patch decision, execution, and test results.

## API contract agreement
Before parallel implementation, the backend lead should publish:
- Endpoint method and path.
- Request JSON.
- Response JSON.
- Error response format.
- Status enums.
- Timestamp format.
- Identifier format.

Do not let frontend and backend members independently invent different field names.

## Demo scenario
Use one deterministic example:
- Application: `demo-api`
- Incident: `GET /users` returns HTTP 500
- Severity: High
- Expected result: approved patch resolves the failure and regression tests pass.

Presentation sequence:
1. Open SentinelMesh AI dashboard.
2. Trigger the demo incident.
3. Open incident details and show logs/evidence.
4. Show Investigator's probable root cause and supporting evidence.
5. Open the Repair patch diff.
6. Approve the patch as the human operator.
7. Show sandbox application status.
8. Show Verifier running tests.
9. Show actual pass/fail output.
10. Show final recovery report and audit history.

Also prepare a failed-patch path if feasible. It demonstrates that the system can reject an ineffective repair rather than claiming success.

## Demo reliability checklist
- [ ] Run the full workflow at least five times.
- [ ] Reset demo data between runs.
- [ ] Ensure API keys are loaded from local environment.
- [ ] Confirm Docker is running before the demo.
- [ ] Prepare a fallback recording or screenshots, clearly identified as fallback material.
- [ ] Avoid depending on unstable external services during the presentation.
- [ ] Keep a known-good commit/tag.
- [ ] Ensure all sample data is labelled.
- [ ] Confirm no secret values appear in terminal output or screenshots.
- [ ] Each member can explain their own module and the complete workflow.

## Final acceptance criteria
The project is ready to present when one incident can be taken from detection through evidence-backed diagnosis, human-approved patch application in a restricted environment, and independent test verification, with accurate status and an audit trail.
