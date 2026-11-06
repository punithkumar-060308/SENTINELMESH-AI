# AI Agents Implementation Guide

## Goal
Implement four specialized agents that perform distinct tasks in the SentinelMesh AI workflow. Start with one LLM provider and separate prompts/tools for each role. Do not train a custom model for the MVP.

## Ownership
Primary owner: AI lead. The lead should pair with the frontend and backend members to explain agent inputs and outputs.

## Agent design principles
- Each agent has one clearly defined responsibility.
- Agents receive structured inputs, not an unlimited dump of the repository.
- Each agent returns structured, validated output.
- Store useful inputs/outputs and execution status for auditability.
- Treat logs, code, and model output as untrusted.
- The LLM may recommend; deterministic application code enforces permissions and executes approved operations.
- Do not allow the model to directly run arbitrary shell commands.

## Shared input context
A workflow state should carry:
- `incident_id`
- `application`
- `error_summary`
- `logs`
- `stack_trace`
- `relevant_files`
- `test_results`
- `patch`
- `human_decision`
- `agent_events`
- `workflow_status`

Keep the context bounded. Select relevant log lines and source snippets instead of sending an entire repository to the model.

## 1. Observer Agent

### Responsibility
Collect and normalize incident evidence. In the MVP, it can receive an incident from the demo app or a manually triggered event. Do not claim full production monitoring.

### Inputs
- Incident trigger
- Application/service identifier
- Error message
- Available logs and stack trace
- Optional health-check result

### Outputs
Structured evidence:
- Short incident summary
- Error type
- Relevant log excerpts
- Stack trace reference
- Evidence sources
- Collection timestamp
- Missing evidence list

### Tasks
1. Accept the demo incident trigger.
2. Collect available logs and error details.
3. Normalize them into a consistent schema.
4. Attach evidence to the incident.
5. Record an Observer activity event.
6. Return evidence references to the workflow.

### Acceptance criteria
- Observer output includes the original error and source.
- Missing data is marked missing, not fabricated.
- Evidence is saved or returned in a predictable schema.

## 2. Investigator Agent

### Responsibility
Analyze evidence and source/configuration context to propose a probable root cause.

### Inputs
- Observer evidence
- Relevant source snippets
- Application context
- Test failure details, if available

### Outputs
- `root_cause_summary`
- `reasoning_summary` (concise, evidence-based explanation)
- `supporting_evidence`
- `suspected_files`
- `confidence` only if meaningfully supported and clearly labelled as model-estimated
- `alternative_hypotheses`
- `missing_information`

### Tasks
1. Read normalized evidence.
2. Identify relevant source/config files through controlled retrieval.
3. Compare the error with code context.
4. Produce a ranked or primary hypothesis.
5. Cite the evidence items supporting the hypothesis.
6. Record an Investigator activity event.

### Acceptance criteria
- Diagnosis refers to actual supplied evidence.
- It does not invent source files or line numbers.
- Uncertainty and missing information are visible.
- Output is structured and usable by Repair.

## 3. Repair Agent

### Responsibility
Generate a minimal, reviewable patch proposal. It must not apply the patch itself.

### Inputs
- Investigator diagnosis
- Relevant source file content
- Existing tests and expected behavior
- Allowed file paths and patch constraints

### Outputs
- Target file path
- Unified diff or another explicitly selected patch format
- Explanation of change
- Expected behavior
- Potential risks
- Tests that should validate the change

### Tasks
1. Confirm the target file is on the allowed path list.
2. Generate the smallest plausible patch.
3. Validate patch format and target path deterministically.
4. Save patch with status `pending`.
5. Present it for human review.
6. Record a Repair activity event.

### Safety rules
- No direct file writes by the LLM.
- No arbitrary command execution.
- No edits outside the demo workspace allowlist.
- No automatic approval.
- Reject malformed diffs or unexpected file paths.
- The backend must independently validate the patch before use.

### Acceptance criteria
- Patch is reviewable.
- File path is allowed.
- Explanation is tied to the diagnosis.
- Patch remains pending until a human decision is recorded.

## 4. Verifier Agent

### Responsibility
Independently run predefined tests after an approved patch has been applied in the sandbox.

### Inputs
- Approved patch ID
- Sandbox execution result
- Test command selected by trusted application configuration
- Test suite and timeout settings

### Outputs
- Test run status
- Passed/failed/skipped counts
- Exit code
- Duration
- Relevant test output
- Whether original failure is resolved
- Whether regression tests pass
- Final verification result

### Tasks
1. Confirm patch has an approved decision.
2. Confirm sandbox application completed.
3. Run the configured test suite in the restricted environment.
4. Capture real process exit code and test output.
5. Compare the result against acceptance conditions.
6. Record verification result and audit event.
7. Report passed or failed. Do not ask an LLM to certify its own fix.

### Acceptance criteria
- Verifier uses actual test execution.
- A failed test produces a failed result.
- A timeout or execution error is not treated as success.
- The final recovery state is set only by deterministic workflow logic using verifier results.

## Shared agent output format
Prefer Pydantic models or equivalent structured schemas. Validate model output before passing it to the next stage. Handle malformed or incomplete output with a controlled error and retry policy; do not loop indefinitely.

## Suggested implementation sequence
1. Create shared schemas.
2. Implement Observer using fixed demo logs.
3. Implement Investigator with bounded evidence and source context.
4. Implement Repair to return a patch proposal only.
5. Implement Verifier using a trusted test runner interface.
6. Add unit tests for valid, malformed, and failure outputs.
7. Connect the nodes through the orchestrator.

## Definition of done
- [ ] Each agent has a single documented responsibility.
- [ ] Inputs and outputs are structured.
- [ ] Agent status and output are recorded.
- [ ] Repair cannot execute or apply code.
- [ ] Human approval is required.
- [ ] Verifier uses actual tests.
- [ ] Errors and uncertainty are visible.
